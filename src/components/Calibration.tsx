import type { CalibrationRow } from "@/lib/calibration";

type Props = {
  rows: CalibrationRow[];
  verdict: string;
};

export function Calibration({ rows, verdict }: Props) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <p className="label">Calibration</p>
        <p className="text-[11px] uppercase tracking-wider text-muted">
          accuracy vs confidence
        </p>
      </div>

      <p className="mt-2 text-sm text-muted">{verdict}</p>

      <div className="mt-5 space-y-4">
        {rows.map((r) => (
          <CalibrationRowView key={r.level} row={r} />
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        A well-calibrated forecaster who says 80% should be right about 80% of the time.
      </p>
    </div>
  );
}

function CalibrationRowView({ row }: { row: CalibrationRow }) {
  const expected = row.level;
  const actual = row.accuracy;
  const hasData = actual != null && row.total > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold tabular-nums">{row.level}%</span>
        <span className="text-muted">
          {hasData ? (
            <>
              <strong className="text-ink tabular-nums">{actual}%</strong>
              <span className="mx-1">·</span>
              <span className="tabular-nums">{row.correct}/{row.total}</span>
              {row.gap != null && (
                <span className={`ml-2 tabular-nums ${row.gap < 0 ? "text-bad" : row.gap > 0 ? "text-good" : ""}`}>
                  {row.gap > 0 ? "+" : ""}
                  {row.gap}
                </span>
              )}
            </>
          ) : (
            <span>no data</span>
          )}
        </span>
      </div>
      {/* track */}
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
        {hasData && (
          <div
            className={`h-full ${actual! >= expected ? "bg-good" : "bg-bad"}`}
            style={{ width: `${Math.min(100, actual!)}%` }}
          />
        )}
        {/* expected marker */}
        <div
          className="absolute top-0 h-full w-[2px] bg-ink/60"
          style={{ left: `calc(${expected}% - 1px)` }}
          aria-label={`expected ${expected}%`}
        />
      </div>
    </div>
  );
}
