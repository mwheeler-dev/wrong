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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "Make your account." : "Welcome back.";
  const cta = isSignup ? "Create account" : "Sign in";
  const altHref = isSignup ? "/login" : "/signup";
  const altLabel = isSignup ? "I have an account" : "Make an account";

  // For signup, the submit button stays disabled until the user agrees to
  // the Terms and Privacy Policy. The native `required` attribute below
  // gives us a built-in HTML-level guard, too.
  const submitDisabled = loading || (isSignup && !agreedToTerms);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSignup && !agreedToTerms) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      // Capture the browser's IANA timezone so the user's daily reset /
      // streak math lines up with their actual local day.
      let timezone: string | undefined;
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) timezone = detected;
      } catch {
        // older browsers may throw — ignore, server will default
      }

      const res = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, timezone }),
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

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate={false}>
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

        {isSignup && (
          <div className="flex items-start gap-3 pt-1">
            <input
              id="tos-agree"
              type="checkbox"
              className="mt-1 h-5 w-5 cursor-pointer rounded border-line accent-ink"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              required
              aria-describedby="tos-agree-desc"
            />
            <label
              htmlFor="tos-agree"
              id="tos-agree-desc"
              className="cursor-pointer text-sm leading-snug text-ink/90"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                Privacy Policy
              </Link>
              .
            </label>
          </div>
        )}

        {error && <p className="text-sm text-bad">{error}</p>}

        <button
          type="submit"
          disabled={submitDisabled}
          className="btn-primary w-full text-base"
        >
          {loading ? "..." : cta}
        </button>
      </form>

      <Link href={altHref} className="mt-6 inline-block text-sm text-muted hover:text-ink">
        {altLabel}
      </Link>
    </div>
  );
}
