"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  seconds: number;
  onExpire?: () => void;
  // changing this key resets the timer
  resetKey: string | number;
};

export function Timer({ seconds, onExpire, resetKey }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    expiredRef.current = false;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const next = Math.max(0, seconds - elapsed);
      setRemaining(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpire?.();
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, seconds]);

  const pct = Math.max(0, Math.min(1, remaining / seconds));
  const isLow = remaining <= 5;

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full transition-[width] duration-100 ease-linear ${isLow ? "bg-bad" : "bg-ink"}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className={`tabular-nums text-sm font-bold ${isLow ? "text-bad" : "text-ink"}`}>
        {Math.ceil(remaining)}s
      </div>
    </div>
  );
}
