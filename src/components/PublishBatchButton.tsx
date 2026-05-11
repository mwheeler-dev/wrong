"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishBatchButton({ scheduledCount }: { scheduledCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/publish-batch", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Could not publish.");
      } else {
        setMsg(
          data.published === 0
            ? "Nothing scheduled to publish."
            : `Promoted ${data.published} question${data.published === 1 ? "" : "s"} to live.`,
        );
        router.refresh();
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">Daily batch</p>
          <p className="mt-1 text-sm">
            <strong className="text-ink">{scheduledCount}</strong>{" "}
            scheduled question{scheduledCount === 1 ? "" : "s"} waiting.
          </p>
        </div>
        <button
          onClick={go}
          disabled={busy || scheduledCount === 0}
          className="btn-primary"
        >
          {busy ? "Publishing..." : "Publish next 10"}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
    </div>
  );
}
