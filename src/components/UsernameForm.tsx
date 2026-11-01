"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { USERNAME_HELP } from "@/lib/usernames";

export function UsernameForm({ currentUsername, nextChangeAt = null }: { currentUsername: string | null; nextChangeAt?: string | null }) {
  const [username, setUsername] = useState(currentUsername ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [availableAt, setAvailableAt] = useState(nextChangeAt);
  const [clock, setClock] = useState(() => Date.now());
  const [localTime, setLocalTime] = useState("");
  const router = useRouter();
  const locked = !!availableAt && Date.parse(availableAt) > clock;
  useEffect(() => { setAvailableAt(nextChangeAt); }, [nextChangeAt]);
  useEffect(() => {
    setClock(Date.now());
    setLocalTime(availableAt ? new Date(availableAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
    if (!availableAt) return;
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [availableAt]);
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
      if (data.nextChangeAt) setAvailableAt(data.nextChangeAt);
      if (res.ok) router.refresh();
    } catch { setMessage("Could not connect. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="mt-4 rounded-2xl border border-line bg-white p-4">
      <label htmlFor="public-username" className="font-semibold">Your public username</label>
      <p id="public-username-help" className="mt-1 text-sm text-muted">Your real name stays private on Boards. {USERNAME_HELP} You can change your username once every 72 hours.</p>
      {locked && <p id="username-cooldown" className="mt-2 text-sm">Next username change: <time dateTime={availableAt!}>{localTime || "checking your local time…"}</time>{localTime ? " (your local time)." : ""}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <input id="public-username" className="input min-w-0 flex-1" required disabled={locked || busy}
          value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
          minLength={8} maxLength={24} pattern="[a-zA-Z0-9_]{8,24}"
          autoComplete="username" autoCapitalize="none" spellCheck={false}
          aria-describedby={locked ? "public-username-help username-cooldown" : "public-username-help"} />
        <button className="btn-primary" disabled={busy || locked} type="submit">{busy ? "Saving…" : locked ? "Change available later" : "Save username"}</button>
      </div>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </form>
  );
}
