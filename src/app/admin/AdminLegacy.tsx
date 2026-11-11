"use client";

import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LocalDate } from "@/components/LocalTime";

type Delivery = {
  created_at: string;
  owner: string | null;
  contact_name: string;
  contact_email: string;
  token: string;
  opened_at: string | null;
};

export default function AdminLegacy() {
  const [rows, setRows] = useState<Delivery[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await createClient().rpc("admin_list_legacy_deliveries");
    setRows((data ?? []) as Delivery[]);
  }

  useEffect(() => {
    let active = true;
    createClient()
      .rpc("admin_list_legacy_deliveries")
      .then(({ data }) => {
        if (active) setRows((data ?? []) as Delivery[]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runCheck() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await createClient().rpc("admin_run_legacy_check");
    setMsg(error ? error.message : `Created ${Number(data)} new deliver${Number(data) === 1 ? "y" : "ies"}.`);
    await load();
    setBusy(false);
  }

  return (
    <section className="mx-auto max-w-4xl px-4 pb-16">
      <div className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HeartHandshake size={20} className="text-pink-400" /> Legacy deliveries
          </h2>
          <button className="btn-ghost text-sm" onClick={runCheck} disabled={busy}>
            {busy ? "Checking…" : "Run inactivity check now"}
          </button>
        </div>
        <p className="mt-1 text-sm text-white/55">
          Legacy users who have been inactive past their chosen period get one delivery per trusted contact.
        </p>
        {msg && <p className="mt-3 text-sm text-white/70">{msg}</p>}
        {rows === null ? (
          <p className="mt-4 text-sm text-white/40">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No deliveries yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="py-1">Created</th>
                <th>From</th>
                <th>To</th>
                <th>Link</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.token} className="border-t border-white/5">
                  <td className="py-2"><LocalDate iso={r.created_at} /></td>
                  <td>{r.owner}</td>
                  <td>
                    {r.contact_name} <span className="text-white/45">{r.contact_email}</span>
                  </td>
                  <td>
                    <a href={`/legacy/${r.token}`} target="_blank" rel="noreferrer" className="text-cyan-mv underline">
                      open
                    </a>
                  </td>
                  <td>{r.opened_at ? <LocalDate iso={r.opened_at} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
