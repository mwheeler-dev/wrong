export type LeaderboardRow = {
  userId: string;
  name: string;
  score: number;
  accuracy: number | null;
  averageConfidence: number | null;
  predictions: number;
};

type Props = {
  rows: LeaderboardRow[];
  highlightUserId?: string;
};

export function LeaderboardTable({ rows, highlightUserId }: Props) {
  if (rows.length === 0) {
    return <p className="card text-sm text-muted">No resolved predictions yet.</p>;
  }
  return (
    <div className="card overflow-hidden p-0">
      <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem] gap-2 border-b border-line bg-ink/[0.02] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <div>#</div>
        <div>User</div>
        <div className="text-right">Score</div>
        <div className="text-right">Acc.</div>
        <div className="text-right">Avg.</div>
      </div>
      <ul>
        {rows.map((r, i) => {
          const isYou = highlightUserId && r.userId === highlightUserId;
          return (
            <li
              key={r.userId}
              className={`grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem] gap-2 border-b border-line px-4 py-3 last:border-b-0 ${isYou ? "bg-accent/30" : ""}`}
            >
              <div className="font-bold tabular-nums">{i + 1}</div>
              <div className="truncate">
                {r.name}
                {isYou && <span className="ml-2 text-xs uppercase tracking-wider text-muted">you</span>}
              </div>
              <div className={`text-right font-bold tabular-nums ${r.score >= 0 ? "text-ink" : "text-bad"}`}>
                {r.score >= 0 ? `+${r.score}` : r.score}
              </div>
              <div className="text-right tabular-nums text-muted">
                {r.accuracy == null ? "—" : `${r.accuracy}%`}
              </div>
              <div className="text-right tabular-nums text-muted">
                {r.averageConfidence == null ? "—" : `${r.averageConfidence}%`}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
