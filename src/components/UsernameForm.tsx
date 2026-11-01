"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { USERNAME_HELP } from "@/lib/usernames";

export function UsernameForm({ currentUsername }: { currentUsername: string | null }) {
  const [username, setUsername] = useState(currentUsername ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/username", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Username saved." : data.error || "Could not save. Try again.");
      if (res.ok) router.refresh();
    } catch { setMessage("Could not connect. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="mt-4 rounded-2xl border border-line bg-white p-4">
      <label htmlFor="public-username" className="font-semibold">Your public username</label>
      <p id="public-username-help" className="mt-1 text-sm text-muted">Your real name stays private on Boards. {USERNAME_HELP}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input id="public-username" className="input min-w-0 flex-1" required
          value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
          minLength={8} maxLength={24} pattern="[a-zA-Z0-9_]{8,24}"
          autoComplete="username" autoCapitalize="none" spellCheck={false}
          aria-describedby="public-username-help" />
        <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save username"}</button>
      </div>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </form>
  );
}
