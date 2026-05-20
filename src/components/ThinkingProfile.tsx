import type { ThinkingProfile } from "@/lib/thinkingProfile";
import { REASONING_OPTIONS } from "@/lib/reasoning";

const LABEL = new Map(REASONING_OPTIONS.map((o) => [o.token, o.label] as const));

export function ThinkingProfile({ profile }: { profile: ThinkingProfile }) {
  if (profile.state === "empty") {
    return (
      <div className="card mt-4 border-dashed bg-paper/40">
        <p className="label">Thinking profile</p>
        <p className="mt-2 text-sm text-muted">
          Make a few more predictions with reasoning tags and we&rsquo;ll start
          showing how you think.
        </p>
      </div>
    );
  }

  const { mostUsed, bestPerforming, categoryNudge, styles } = profile;

  return (
    <div className="card mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label">Thinking profile</p>
        <p className="text-[11px] uppercase tracking-wider text-muted tabular-nums">
          {profile.totalWithReasoning} tagged
        </p>
      </div>

      {mostUsed && (
        <p className="display mt-2 text-xl sm:text-2xl">
          You mostly predict from{" "}
          <span className="text-accent">{LABEL.get(mostUsed.token)}</span>.
        </p>
      )}

      {/* Distribution — slim stacked bar + chip row. Cheaper than a chart
          library, and the chips double as a legend. */}
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-ink/10">
        {styles.map((s, i) =>
          s.sharePct === 0 ? null : (
            <div
              key={s.token}
              style={{ width: `${s.sharePct}%` }}
              className={
                i === 0
                  ? "h-full bg-ink"
                  : i === 1
                    ? "h-full bg-accent"
                    : "h-full bg-ink/40"
              }
              aria-label={`${LABEL.get(s.token)} ${s.sharePct}%`}
            />
          ),
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {styles.map((s, i) => (
          <div
            key={s.token}
            className="rounded-2xl border border-line bg-white p-2.5"
          >
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`inline-block h-2 w-2 rounded-full ${
                  i === 0
                    ? "bg-ink"
                    : i === 1
                      ? "bg-accent"
                      : "bg-ink/40"
                }`}
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {LABEL.get(s.token)}
              </p>
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {s.sharePct}%
            </p>
            <p className="text-[11px] text-muted tabular-nums">
              {s.uses} use{s.uses === 1 ? "" : "s"}
              {s.accuracyPct != null && (
                <>
                  {" · "}
                  <span className="font-semibold text-ink">
                    {s.accuracyPct}%
                  </span>{" "}
                  hit
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Best-performing claim — only fires when at least one style has
          met MIN_SAMPLE resolved. */}
      {bestPerforming && (
        <p className="mt-4 text-sm text-ink">
          Your{" "}
          <span className="font-semibold text-ink">
            {LABEL.get(bestPerforming.token)}
          </span>
          -based calls are landing best right now —{" "}
          <span className="tabular-nums">
            {bestPerforming.accuracyPct}% on {bestPerforming.resolved} resolved
          </span>
          .
        </p>
      )}

      {/* Category nudge — single strongest (category, style) pair when we
          have enough data. Below-50 accuracies are filtered upstream so we
          don't accidentally praise a weak style. */}
      {categoryNudge && (
        <p className="mt-2 text-sm text-muted">
          In{" "}
          <span className="font-semibold text-ink">
            {categoryNudge.category}
          </span>
          , your{" "}
          <span className="font-semibold text-ink">
            {LABEL.get(categoryNudge.token)}
          </span>{" "}
          picks are strongest —{" "}
          <span className="tabular-nums">
            {categoryNudge.accuracyPct}% on {categoryNudge.resolved} resolved
          </span>
          .
        </p>
      )}

      {/* Quiet fallback: distribution is shown but no performance claim
          fits yet. Communicates that the system is working — it's just
          waiting on more resolved data. */}
      {!bestPerforming && !categoryNudge && (
        <p className="mt-4 text-xs text-muted">
          Resolve a few more tagged predictions to see which style is
          landing best. (Need {Math.max(0, 5 - profile.totalResolvedWithReasoning)} more.)
        </p>
      )}
    </div>
  );
}
