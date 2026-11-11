import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Log in · MemoryVerse" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
