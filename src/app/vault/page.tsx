import { Suspense } from "react";
import Link from "next/link";
import PageSkeleton from "@/components/PageSkeleton";
import { Plus } from "lucide-react";
import CapsuleCard from "@/components/CapsuleCard";
import { getMyCapsules } from "@/lib/data";

export const metadata = { title: "Memory Vault · MemoryVerse" };

export default function VaultPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VaultPageContent />
    </Suspense>
  );
}

async function VaultPageContent() {
  const { capsules, urls } = await getMyCapsules("memory");

  const byYear = new Map<string, typeof capsules>();
  for (const c of capsules) {
    const year = new Date(c.memory_date ?? c.created_at).getFullYear().toString();
    byYear.set(year, [...(byYear.get(year) ?? []), c]);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Memory Vault</h1>
          <p className="mt-1 text-white/60">
            {capsules.length} {capsules.length === 1 ? "memory" : "memories"} kept safe
          </p>
        </div>
        <Link href="/new" className="btn-primary">
          <Plus size={16} /> New capsule
        </Link>
      </div>

      {capsules.length === 0 ? (
        <div className="glass mt-10 p-12 text-center">
          <p className="text-4xl">🌌</p>
          <h2 className="mt-4 text-xl font-semibold">Your universe is still empty</h2>
          <p className="mt-2 text-white/60">Add your first memory — a photo, a voice note or a few lines.</p>
          <Link href="/new" className="btn-primary mt-6">
            <Plus size={16} /> Create a capsule
          </Link>
        </div>
      ) : (
        [...byYear.entries()].map(([year, items]) => (
          <section key={year} className="mt-10">
            <h2 className="mb-4 text-sm font-semibold tracking-widest text-amber-mv">{year}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <CapsuleCard key={c.id} capsule={c} url={c.media_path ? urls[c.media_path] : undefined} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
