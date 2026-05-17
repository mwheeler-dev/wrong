"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** The timezone currently stored on the user's account (null if never set). */
  storedTimezone: string | null;
};

/**
 * Reads the browser's IANA timezone on mount and POSTs it to the server if
 * it differs from what we have on file. Mounted in the root layout, but
 * only rendered when there's a signed-in user — anonymous visitors never
 * touch this endpoint.
 *
 * No-op when:
 *   - the browser doesn't expose `Intl.DateTimeFormat().resolvedOptions()`
 *   - the detected tz equals what's already stored
 *   - we already attempted a sync for this tz this session (sessionStorage)
 */
export function TimezoneSync({ storedTimezone }: Props) {
  const router = useRouter();

  useEffect(() => {
    let detected: string | undefined;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected) return;
    if (detected === storedTimezone) return;

    // Don't hammer the endpoint if we've already POSTed this tz this session
    // and the server hasn't reflected it yet (eventual consistency edge).
    const cacheKey = "wrong:tzSync";
    try {
      if (sessionStorage.getItem(cacheKey) === detected) return;
    } catch {
      // sessionStorage can throw in some private modes — fall through
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/timezone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: detected }),
        });
        if (!res.ok) return;
        try {
          sessionStorage.setItem(cacheKey, detected!);
        } catch {}
        // Refresh server components so the new tz takes effect immediately
        // (dashboard windows, /play daily cap, countdown target, etc.).
        router.refresh();
      } catch {
        // Best-effort — silent on network failures
      }
    })();
  }, [storedTimezone, router]);

  return null;
}
