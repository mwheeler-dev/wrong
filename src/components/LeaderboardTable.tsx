import { TrophyIcon } from "./icons/TrophyIcon";

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
        <div className="text-right">Edge</div>
        <div className="text-right">Acc.</div>
        <div className="text-right">Avg.</div>
      </div>
      <ul>
        {rows.map((r, i) => {
          const isYou = highlightUserId && r.userId === highlightUserId;
          const rank = i + 1;
          // Podium ladder — restrained. #1 gets the trophy + full lime accent
          // bar + strongest gradient. #2 and #3 step down in intensity so the
          // table still reads as a list, not a podium graphic.
          const podiumBg =
            rank === 1
              ? "bg-gradient-to-r from-accent/14 via-accent/7 to-transparent"
              : rank === 2
                ? "bg-gradient-to-r from-accent/8 via-accent/3 to-transparent"
                : rank === 3
                  ? "bg-gradient-to-r from-accent/5 to-transparent"
                  : "";
          const accentBarOpacity =
            rank === 1 ? "bg-accent" : rank === 2 ? "bg-accent/60" : rank === 3 ? "bg-accent/35" : "";

          const rowBg = isYou ? "bg-accent/30" : podiumBg;
          const rankClass =
            rank === 1
              ? "text-accent drop-shadow-[0_0_8px_rgba(217,255,0,0.55)]"
              : rank === 2
                ? "text-accent/85"
                : rank === 3
                  ? "text-accent/65"
                  : "text-ink";
          return (
            <li
              key={r.userId}
              className={`group relative grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem] items-center gap-2 border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-ink/[0.02] ${rowBg}`}
            >
              {rank <= 3 && (
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 h-full w-[3px] ${accentBarOpacity} ${
                    rank === 1 ? "shadow-[0_0_12px_rgba(217,255,0,0.55)]" : ""
                  }`}
                />
              )}
              <div className={`flex items-center font-bold tabular-nums ${rankClass}`}>
                {rank === 1 ? (
                  <TrophyIcon className="streak-trophy h-5 w-5" />
                ) : (
                  rank
                )}
              </div>
              <div className="truncate">
                {r.name}
                {isYou && (
                  <span className="ml-2 text-xs uppercase tracking-wider text-muted">
                    you
                  </span>
                )}
              </div>
              <div
                className={`text-right font-bold tabular-nums ${
                  r.score >= 0 ? "text-ink" : "text-bad"
                }`}
              >
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
