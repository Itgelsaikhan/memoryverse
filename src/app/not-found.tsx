import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl">🌠</p>
      <h1 className="mt-4 text-2xl font-bold">Lost in space</h1>
      <p className="mt-2 text-white/60">This capsule doesn&apos;t exist, or it is still sealed.</p>
      <Link href="/" className="btn-primary mt-6">
        Back home
      </Link>
    </div>
  );
}
