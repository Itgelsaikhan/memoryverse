import { Suspense } from "react";
import NewCapsuleForm from "./NewCapsuleForm";

export const metadata = { title: "New capsule · MemoryVerse" };

export default function NewCapsulePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Suspense>
        <NewCapsuleForm />
      </Suspense>
    </div>
  );
}
