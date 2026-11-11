"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(
    params.get("mode") === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [info, setInfo] = useState<string | null>(null);

  const next = params.get("next") || "/vault";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/vault";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isSupabaseConfigured) {
      setError("The app is not connected to Supabase yet.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push(safeNext);
          router.refresh();
        } else {
          setInfo("Check your inbox and click the confirmation link to activate your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(safeNext);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass p-8">
      <h1 className="text-2xl font-bold">
        {mode === "signup" ? "Create your universe" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-white/60">
        {mode === "signup"
          ? "Free forever for your first 50 capsules."
          : "Log in to open your Memory Vault."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Email</span>
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Password</span>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}
        {info && <p className="rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300">{info}</p>}

        <button className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        {mode === "signup" ? "Already have an account?" : "New to MemoryVerse?"}{" "}
        <button
          type="button"
          className="text-cyan-mv hover:underline"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "signup" ? "Log in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
