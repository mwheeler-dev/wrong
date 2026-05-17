// The Wrong. scoring unit is "Edge". Single source of truth so every
// surface (ScoreCard, ResultCard, LeaderboardTable, /play, /dashboard,
// /leagues, etc.) names it the same way.
//
// Why "Edge":
//   - native to prediction markets / sports betting ("having an edge")
//   - short, memorable, singular (no awkward plural)
//   - culturally sharp without sounding technical or corporate

export const EDGE = "Edge";
export const EDGE_LOWER = "edge";

/** Signed integer display: "+90", "-40", "0". */
export function formatEdge(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

/** "+90 Edge" — used inline in result cards, captions, hints. */
export function formatEdgeWithUnit(value: number): string {
  return `${formatEdge(value)} ${EDGE}`;
}
