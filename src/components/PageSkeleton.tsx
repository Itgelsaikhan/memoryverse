export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-white/5" />
      <div className="mt-3 h-5 w-40 animate-pulse rounded-lg bg-white/5" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-48 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
