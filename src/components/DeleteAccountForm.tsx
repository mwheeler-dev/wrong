"use client";

import { useState } from "react";

const REQUIRED = "DELETE";

/**
 * Two-stage destructive confirmation for account deletion.
 *
 * Stage 1: "Delete account" button (red outline). Clicking flips the form
 *          open — it does NOT call the server. This prevents a stray tap
 *          from starting the flow.
 *
 * Stage 2: An explicit typed-confirmation input. The final red button
 *          stays disabled until the user has literally typed "DELETE"
 *          into the field. Case-sensitive on purpose — matching Google/
 *          GitHub convention.
 *
 * On success the server clears the httpOnly session cookie. We then hard-
 * navigate to /login with ?deleted=1 so any client-cached React state is
 * torn down and the browser reads the now-empty cookie on the next
 * request. Using window.location.replace instead of assign so the deleted
 * dashboard page isn't in the back-button history.
 */
export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const armed = typed === REQUIRED;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!armed) {
      setError(`Type ${REQUIRED} to confirm.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: REQUIRED }),
      });
      if (!res.ok) {
        // Do NOT navigate away on failure. The user still has an
        // account and a valid session; leaving them on the confirm
        // screen lets them retry or contact support.
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete account. Try again.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
      return;
    }
    // Hard replace so cached RSC payloads from the destroyed account
    // can't render again. The server has already cleared the cookie.
    window.location.replace("/login?deleted=1");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-bad px-5 py-3 text-sm font-semibold text-bad transition hover:bg-bad hover:text-paper active:scale-[0.98]"
      >
        Delete account
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label
          htmlFor="delete-confirm"
          className="label"
        >
          Type <span className="font-bold text-bad">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            if (error) setError(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={busy}
          placeholder="DELETE"
          className="input mt-1"
        />
      </div>

      <p className="text-xs text-muted">
        This removes your account and every prediction, reasoning tag,
        reflection, and journal entry attached to it. It cannot be undone.
      </p>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          disabled={busy}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!armed || busy}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-bad px-5 py-3 text-sm font-semibold text-paper transition hover:brightness-95 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
        >
          {busy ? "Deleting…" : "Permanently delete my account"}
        </button>
      </div>
    </form>
  );
}
