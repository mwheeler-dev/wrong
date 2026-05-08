"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "Make your account." : "Welcome back.";
  const cta = isSignup ? "Create account" : "Sign in";
  const altHref = isSignup ? "/login" : "/signup";
  const altLabel = isSignup ? "I have an account" : "Make an account";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/play");
      router.refresh();
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="wrap pt-12">
      <h1 className="display text-5xl">{title}</h1>
      <p className="mt-2 text-muted">How wrong are you today?</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {isSignup && (
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input
              id="name"
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full text-base">
          {loading ? "..." : cta}
        </button>
      </form>

      <Link href={altHref} className="mt-6 inline-block text-sm text-muted hover:text-ink">
        {altLabel}
      </Link>
    </div>
  );
}
