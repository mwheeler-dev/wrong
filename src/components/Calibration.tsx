import {
  calibrationCopyFor,
  type CalibrationCopy,
  type CalibrationRow,
} from "@/lib/calibration";
import type { Confidence } from "@/lib/scoring";
import { InfoTooltip } from "./InfoTooltip";

type Props = {
  rows: CalibrationRow[];
  verdict: string;
};

export function Calibration({ rows, verdict }: Props) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="label">Calibration</p>
          <InfoTooltip label="What is Calibration?">
            Calibration compares your confidence levels against actual
            outcomes.
          </InfoTooltip>
        </div>
        <p className="text-[11px] uppercase tracking-wider text-muted">
          accuracy vs confidence
        </p>
      </div>

      {/* Plain-English explainer — held below the eyebrow so anyone who
          doesn't know the term gets it on first read. */}
      <p className="mt-1 text-sm text-ink/80">
        The gap between how sure you are and how often you’re actually right.
      </p>

      {/* Dynamic verdict — always references "confidence" explicitly */}
      <p className="mt-3 text-sm text-muted">{verdict}</p>

      <div className="mt-6 divide-y divide-line">
        {rows.map((r) => (
          <CalibrationRowView key={r.level} row={r} />
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        A well-calibrated forecaster who says 80% confidence should be right
        about 80% of the time.
      </p>
    </div>
  );
}

function CalibrationRowView({ row }: { row: CalibrationRow }) {
  const copy = calibrationCopyFor(row.level as Confidence, row.accuracy, row.total);
  const hasData = row.accuracy != null && row.total > 0;
  const accuracy = row.accuracy;
  const expected = row.level;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Header row: confidence level + verdict on the right */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="display text-2xl tabular-nums">{row.level}%</span>
          <span className="text-[11px] uppercase tracking-wider text-muted">
            confidence
          </span>
        </div>
        <VerdictPill copy={copy} />
      </div>

      {/* Narrative + reality response */}
      <p className="mt-2 text-sm leading-snug">
        <span className="font-semibold text-ink">{copy.lede}</span>{" "}
        <span className="text-muted">{copy.response}</span>
      </p>

      {/* Calibration bar — accuracy fill + expected-confidence marker */}
      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
        {hasData && (
          <div
            className={`h-full ${
              copy.verdict.tone === "good"
                ? "bg-good"
                : copy.verdict.tone === "bad"
                  ? "bg-bad"
                  : "bg-ink"
            }`}
            style={{ width: `${Math.min(100, accuracy as number)}%` }}
          />
        )}
        <div
          className="absolute top-0 h-full w-[2px] bg-ink/60"
          style={{ left: `calc(${expected}% - 1px)` }}
          aria-label={`expected ${expected}%`}
        />
      </div>

      {/* Stats line */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted tabular-nums">
        <span>
          {hasData ? (
            <>
              <strong className="text-ink">{accuracy}%</strong>
              <span className="mx-1">·</span>
              {row.correct}/{row.total}
            </>
          ) : (
            "no reps"
          )}
        </span>
        {row.gap != null && (
          <span
            className={
              row.gap < 0
                ? "text-bad"
                : row.gap > 0
                  ? "text-good"
                  : "text-muted"
            }
          >
            {row.gap > 0 ? "+" : ""}
            {row.gap}
          </span>
        )}
      </div>
    </div>
  );
}

function VerdictPill({ copy }: { copy: CalibrationCopy }) {
  const tone = copy.verdict.tone;
  const colorClass =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-bad"
        : tone === "neutral"
          ? "text-muted"
          : "text-ink";
  return (
    <div className="text-right">
      <p className={`text-sm font-bold ${colorClass}`}>{copy.verdict.label}</p>
      <p className="text-xs text-muted">{copy.verdict.line}</p>
    </div>
  );
}
