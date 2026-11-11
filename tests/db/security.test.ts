/**
 * Database security & business-rule tests.
 * Runs every migration in an embedded Postgres (PGlite) with stubs for Supabase's auth/storage schemas,
 * then exercises Row Level Security, plan limits and Legacy rules as real users would.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { PLANS } from "@/lib/plans";

const A = "11111111-1111-1111-1111-111111111111"; // admin
const B = "22222222-2222-2222-2222-222222222222"; // regular user
const C = "33333333-3333-3333-3333-333333333333"; // another regular user

let db: PGlite;

/** Run SQL as a signed-in user (or anonymous when uid is null). */
async function as<T = Record<string, unknown>>(uid: string | null, sql: string) {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; set test.uid = '${uid ?? ""}';`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-ins for what Supabase provides
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    alter table storage.objects enable row level security;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on all functions in schema auth to authenticated, anon;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, f), "utf8"));
  }
  await db.exec(`
    insert into auth.users values ('${A}', 'a@test'), ('${B}', 'b@test'), ('${C}', 'c@test');
    update public.profiles set role = 'admin' where id = '${A}';
  `);
});

describe("profiles & roles", () => {
  it("creates a profile for every new user", async () => {
    expect(await db.query("select count(*)::int as n from public.profiles")).toMatchObject({ rows: [{ n: 3 }] });
  });
  it("users cannot make themselves admin or change their plan", async () => {
    await expect(as(B, `update profiles set role = 'admin' where id = '${B}'`)).rejects.toThrow(/permission denied/);
    await expect(as(B, `update profiles set plan = 'legacy' where id = '${B}'`)).rejects.toThrow(/permission denied/);
  });
  it("is_admin reflects the role", async () => {
    expect((await as(A, "select is_admin() as v"))[0]).toEqual({ v: true });
    expect((await as(B, "select is_admin() as v"))[0]).toEqual({ v: false });
  });
});

describe("capsules & sealing", () => {
  it("users only see their own capsules", async () => {
    await as(B, `insert into capsules (title, body) values ('B memory', 'secret')`);
    expect(await as(C, "select * from capsules")).toHaveLength(0);
    expect(await as(null, "select * from capsules")).toHaveLength(0);
  });

  it("sealed content is hidden from the owner until it opens", async () => {
    await as(B, `insert into capsules (kind, title, body, unlock_at) values ('future', 'Sealed', 'hidden text', now() + interval '1 year')`);
    expect(await as(B, `select * from capsules where title = 'Sealed'`)).toHaveLength(0);
    const listed = await as<{ title: string; body: string | null; is_sealed: boolean }>(B, `select title, body, is_sealed from list_my_capsules('future')`);
    expect(listed).toEqual([{ title: "Sealed", body: null, is_sealed: true }]);
  });

  it("sealed capsules cannot be edited but can be deleted by the owner", async () => {
    await as(B, `update capsules set body = 'hacked' where title = 'Sealed'`);
    const id = (await db.query<{ id: string }>(`select id from capsules where title = 'Sealed'`)).rows[0].id;
    expect((await db.query<{ body: string }>(`select body from capsules where id = '${id}'`)).rows[0].body).toBe("hidden text");
    await expect(as(C, `select delete_my_capsule('${id}')`)).rejects.toThrow(/CAPSULE_NOT_FOUND/);
    await as(B, `select delete_my_capsule('${id}')`);
    expect((await db.query(`select 1 from capsules where id = '${id}'`)).rows).toHaveLength(0);
  });

  it("future capsules must open in the future", async () => {
    await expect(as(B, `insert into capsules (kind, title, unlock_at) values ('future', 'x', now() - interval '1 day')`)).rejects.toThrow();
  });
});

describe("plan limits", () => {
  it("free users: 5-year seal, no video", async () => {
    await expect(as(C, `insert into capsules (kind, title, unlock_at) values ('future', 'x', now() + interval '6 years')`)).rejects.toThrow(/PLAN_UNLOCK_LIMIT/);
    await expect(as(C, `insert into capsules (title, media_path) values ('v', '${C}/a.mp4')`)).rejects.toThrow(/PLAN_VIDEO/);
  });

  it("free users: at most 50 capsules", async () => {
    await db.exec(`insert into capsules (user_id, title) select '${C}', 'bulk ' || g from generate_series(1, 50) g`);
    await expect(as(C, `insert into capsules (title) values ('51st')`)).rejects.toThrow(/FREE_LIMIT_REACHED/);
    await db.exec(`delete from capsules where user_id = '${C}'`);
  });

  it("payments cannot be forged and prices come from the database", async () => {
    await expect(as(B, `insert into payments (user_id, plan, period, amount_cents, status) values ('${B}', 'premium', 'year', 0, 'succeeded')`)).rejects.toThrow(/row-level security/);
    await expect(as(B, `select demo_checkout('legacy', 'month')`)).rejects.toThrow(/INVALID_PLAN/);
  });

  it("client prices match database prices", async () => {
    for (const p of PLANS.filter((p) => p.id !== "free")) {
      for (const [period, cents] of Object.entries(p.prices)) {
        const row = await db.query<{ v: number }>(`select plan_price_cents('${p.id}', '${period}') as v`);
        expect(row.rows[0].v, `${p.id}/${period}`).toBe(cents);
      }
    }
  });

  it("checkout upgrades the plan; cancelling keeps it until the period ends", async () => {
    await as(B, `select demo_checkout('premium', 'year')`);
    expect((await as<{ effective_plan: string }>(B, "select effective_plan from my_plan()"))[0].effective_plan).toBe("premium");
    await as(B, `insert into capsules (kind, title, unlock_at) values ('future', '20y', now() + interval '20 years')`);
    await expect(as(B, `insert into capsules (kind, title, unlock_at) values ('future', '60y', now() + interval '60 years')`)).rejects.toThrow(/UNLOCK_TOO_FAR/);
    await as(B, "select set_cancel_at_period_end(true)");
    expect((await as<{ effective_plan: string }>(B, "select effective_plan from my_plan()"))[0].effective_plan).toBe("premium");
    await db.exec(`update profiles set plan_renews_at = now() - interval '1 day' where id = '${B}'`);
    expect((await as<{ effective_plan: string }>(B, "select effective_plan from my_plan()"))[0].effective_plan).toBe("free");
    expect(await as(C, "select * from payments")).toHaveLength(0);
  });
});

describe("Humanity Map", () => {
  it("only admins can import datasets", async () => {
    const rows = JSON.stringify([["Got promoted today at work", "achievement", "pride", "USA", 30, "m", "24h"]]);
    await expect(as(B, `select admin_import_moments('happydb', '${rows}'::jsonb)`)).rejects.toThrow(/ADMIN_ONLY/);
    expect((await as<{ n: number }>(A, `select admin_import_moments('happydb', '${rows}'::jsonb) as n`))[0].n).toBe(1);
  });

  it("public memories appear anonymously; private and future capsules never do", async () => {
    await as(C, `insert into capsules (title, body, emotion, country, is_public) values ('Naadam', 'Horse race with my family', 'joy', 'MNG', true)`);
    await as(C, `insert into capsules (title, body, country, is_public) values ('Private', 'not shared', 'MNG', false)`);
    await as(C, `insert into capsules (kind, title, body, country, is_public, unlock_at) values ('future', 'Secret', 'letter', 'MNG', true, now() + interval '1 year')`);
    const seen = await as<{ text: string }>(null, `select text from moments where country = 'MNG'`);
    expect(seen).toEqual([{ text: "Horse race with my family" }]);
    expect((await as<{ total: number }>(null, `select total from country_stats where country = 'MNG'`))[0].total).toBe(1);
  });

  it("unsharing removes the moment", async () => {
    await as(C, `update capsules set is_public = false where title = 'Naadam'`);
    expect(await as(null, `select * from moments where country = 'MNG'`)).toHaveLength(0);
  });
});

describe("Legacy", () => {
  it("contacts require the Legacy plan and stay private", async () => {
    await expect(as(C, `insert into legacy_contacts (name, email) values ('Mom', 'mom@test.mn')`)).rejects.toThrow(/PLAN_LEGACY_REQUIRED/);
    await as(B, `select demo_checkout('legacy', 'year')`);
    await as(B, `insert into legacy_contacts (name, email, relationship) values ('Mom', 'mom@test.mn', 'mother')`);
    expect(await as(C, "select * from legacy_contacts")).toHaveLength(0);
  });

  it("deliveries are created only after inactivity, once, and never include sealed capsules", async () => {
    await expect(as(B, "select _run_legacy_check()")).rejects.toThrow(/permission denied/);
    expect((await as<{ n: number }>(A, "select admin_run_legacy_check() as n"))[0].n).toBe(0);
    await db.exec(`update profiles set last_seen_at = now() - interval '400 days' where id = '${B}'`);
    expect((await as<{ n: number }>(A, "select admin_run_legacy_check() as n"))[0].n).toBe(1);
    expect((await as<{ n: number }>(A, "select admin_run_legacy_check() as n"))[0].n).toBe(0);

    const token = (await db.query<{ token: string }>(`select token from legacy_deliveries where kind = 'delivery'`)).rows[0].token;
    const view = (await as<{ v: { to: string; capsules: { title: string }[] } }>(null, `select legacy_view('${token}') as v`))[0].v;
    expect(view.to).toBe("Mom");
    const titles = view.capsules.map((c) => c.title);
    expect(titles).toContain("B memory");
    expect(titles).not.toContain("20y");
    expect((await as<{ v: unknown }>(null, `select legacy_view('wrong') as v`))[0].v).toBeNull();
  });
});
