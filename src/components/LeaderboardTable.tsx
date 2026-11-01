"use client";

import { useEffect, useState } from "react";
import { TrophyIcon } from "./icons/TrophyIcon";
import type { PlayerBadge } from "@/lib/player-badges";

export type LeaderboardRow = {
  userId: string;
  username: string;
  score: number;
  accuracy: number | null;
  averageConfidence: number | null;
  predictions: number;
};
type PlayerProfile = Omit<LeaderboardRow, "userId"> & { currentStreak: number; longestStreak: number; badges: PlayerBadge[] };
const columns = "grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_3rem] items-center gap-2 px-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_4rem] sm:px-4";
const percent = (n: number | null) => n == null ? "—" : `${n}%`;
const edge = (n: number) => n >= 0 ? `+${n}` : String(n);

export function LeaderboardTable({ rows, highlightUserId }: { rows: LeaderboardRow[]; highlightUserId?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (rows.length === 0) return <p className="card text-sm text-muted">No resolved predictions yet.</p>;
  return (
    <div className="card overflow-hidden p-0">
      <div className={`${columns} border-b border-line bg-ink/[0.02] py-3 text-[11px] font-semibold uppercase tracking-wider text-muted`}>
        <div>#</div><div>Username</div><div className="text-right">Edge</div><div className="text-right"><abbr title="Accuracy" className="no-underline">Acc.</abbr></div>
      </div>
      <ul>
        {rows.map((r, i) => {
          const isYou = r.userId === highlightUserId;
          const open = expanded === r.userId;
          return (
            <li key={r.userId} className={`border-b border-line last:border-b-0 ${isYou ? "bg-accent/20" : i < 3 ? "bg-accent/5" : ""}`}>
              <div className={`${columns} py-3`}>
                <div className={`font-bold tabular-nums ${i < 3 ? "text-accent" : ""}`} aria-label={`Rank ${i + 1}`}>
                  {i === 0 ? <TrophyIcon className="h-5 w-5" /> : i + 1}
                </div>
                <button type="button" onClick={() => setExpanded(open ? null : r.userId)}
                  aria-expanded={open} aria-controls={`player-${r.userId}`}
                  className="min-h-11 min-w-0 text-left text-sm font-semibold underline decoration-ink/20 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink sm:text-base">
                  <span className="[overflow-wrap:anywhere]">@{r.username}</span>
                  <span className="ml-1 inline-block text-xs font-normal text-muted">{isYou ? "you · " : ""}{open ? "−" : "+"}</span>
                </button>
                <div className={`text-right text-sm font-bold tabular-nums sm:text-base ${r.score < 0 ? "text-bad" : ""}`}>{edge(r.score)}</div>
                <div className="text-right text-sm tabular-nums text-muted sm:text-base">{percent(r.accuracy)}</div>
              </div>
              <div id={`player-${r.userId}`} hidden={!open}>
                {open && <PlayerCard key={r.userId} row={r} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlayerCard({ row }: { row: LeaderboardRow }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(`/api/players/${encodeURIComponent(row.userId)}`, { signal: controller.signal })
      .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then(setProfile).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [row.userId, attempt]);
  return (
    <section aria-label={`Player details for ${row.username}`} className="mx-3 mb-3 rounded-xl border border-line bg-white p-4">
      <p className="font-bold [overflow-wrap:anywhere]">@{profile?.username ?? row.username}</p>
      <p className="mt-2 text-xs text-muted">On this board: {row.predictions} resolved · {percent(row.averageConfidence)} average confidence</p>
      {!profile && !error && <p role="status" className="mt-3 text-sm text-muted">Loading stats and badges…</p>}
      {error && <p role="alert" className="mt-3 text-sm">Could not load player details. <button type="button" className="underline" onClick={() => setAttempt((n) => n + 1)}>Try again</button></p>}
      {profile && <>
        <p className="label mt-4">All-time stats</p>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[["Edge", edge(profile.score)], ["Accuracy", percent(profile.accuracy)], ["Avg. confidence", percent(profile.averageConfidence)], ["Resolved", profile.predictions], ["Current streak", `${profile.currentStreak} days`], ["Best streak", `${profile.longestStreak} days`]].map(([label, value]) => (
            <div key={label}><dt className="text-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>
          ))}
        </dl>
        <p className="label mt-4">Badges</p>
        {profile.badges.length ? <ul className="mt-2 space-y-2">{profile.badges.map((badge) => (
          <li key={badge.id} className="rounded-lg border border-line p-3">
            <p className="text-sm font-semibold"><span aria-hidden>{badge.icon}</span> {badge.title}</p>
            <p className="mt-1 text-xs text-muted">{badge.description}</p>
          </li>
        ))}</ul> : <p className="mt-2 text-sm text-muted">No badges yet. Complete 10 predictions a day for a 3, 7, or 30-day streak, or lead a category with at least 10 resolved predictions and positive Edge.</p>}
      </>}
    </section>
  );
}
