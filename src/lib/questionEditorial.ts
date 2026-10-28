// Player wording and event selection belong here; exact adjudication stays in
// resolutionCriteria. These rules apply only to AI drafts, not manual entry.
export const QUESTION_EDITORIAL_GUIDE = `Write for a curious everyday player, not an industry analyst. A player should understand the question on the first read and have a reason to pick a side. Choose the event for its audience interest BEFORE writing the question. A short question about an obscure administrative formality is still a bad choice.
Prefer news people talk about: upcoming games, new music, films, TV, games, recognizable products, public decisions, health developments and discoveries that affect everyday life. Mix familiar stories with accessible discoveries; do not fill the batch with the same celebrity or the biggest three tech companies. Interesting science and world news belong here when their stakes are easy to understand.
Skip routine board elections, committee appointments, internal reorganizations, licensed-business integration milestones, specialist regulatory paperwork and clinical-trial reporting metrics in general batches. Do not search for obscure organizations merely to satisfy category diversity. An explicit specialist topic request can take priority over this selection rule.
The question text is one short, direct YES/NO question: aim for 8–18 words, at most 24 words and 180 characters. Use a familiar name, one understandable outcome and a clear date. Say 'release', 'win', 'launch', 'approve' or 'reach' instead of 'publicly report', 'complete an integration milestone' or 'issue a formal statement indicating'. Avoid jargon, unexplained institutional acronyms, procedural qualifiers and multiple outcomes joined together.
STYLE EXAMPLES ONLY, NOT NEWS OR SUGGESTED EVENTS: 'Will a new COVID-19 vaccine roll out in the US by Jan 31?' 'Will [artist] release a new album by Friday, Oct 16?' 'Will [team] win its Oct 18 game?' Use actual researched names and dates. Never reuse example subjects as a default roster.
Keep the exact timezone, official source, threshold definitions, exceptions and reporting rules in resolutionCriteria. Include the place or essential threshold in the question when it changes what players are predicting; shortening must not change the outcome. A trial result is not a vaccine rollout. If an event needs specialist terminology to make sense, choose a different researched event rather than disguising it with vague wording.
For music, deliberately research different artists, genres, scenes and countries. Do not default to Taylor Swift or replace her with a single other recurring artist. A broad music request requires different artists; only a request naming an artist permits repeated questions about that artist.
For companies known for consumer products, entertainment, gaming or social platforms, predict the consumer-facing story that made the company relevant, NOT its share price, investor relations, quarterly earnings, analyst ratings or stock performance. EA means games and players, not ticker EA. A brand's existence does not make its stock performance a culturally relevant prediction. Business-category questions should still concern consumer-facing events, major labor decisions or public consequences unless an explicit finance-focused topic was requested.
Before returning each draft, read it aloud: would an ordinary interested player immediately know what is at stake, without looking up a committee, filing or technical term? If not, replace the event. No academic phrasing, fake controversy, invented stakes or certainty disguised as a prediction.`;

export function draftWordingIssue(text: string, focus = ""): string | null {
  if (text.length > 180 || text.trim().split(/\s+/).length > 24)
    return "A draft was too long for a plain, direct question.";
  // A trending consumer brand is not permission to turn gaming/pop culture
  // into an investor question. Reject these before the admin sees the draft.
  const financeWording = /\\b(stock|share price|shares|nasdaq|nyse|ticker|market cap|earnings|adjusted eps|quarterly results|closing price|close above|close below|investor guidance|analyst rating)\\b/i;
  const financeFocus = /\\b(stock|shares|finance|financial|earnings|trading|nasdaq|nyse|investing|market)\\b/i;
  if (financeWording.test(text) && !financeFocus.test(focus))
    return "A consumer-facing topic was converted into an investor or stock-market question.";
  // Backstop for the specialist language seen in actual generated cards.
  // A request explicitly using those specialist terms may call for them.
  const specialistWording = /\b(topline|phase\s*(?:[1-4]|i{1,3}|iv)\b|plenipotentiary|radio regulations board|licensed business|integration milestone|reorgani[sz]ation)\b/i;
  if (
    specialistWording.test(text) &&
    !specialistWording.test(focus)
  )
    return "A draft used specialist or procedural wording instead of an accessible event.";
  return null;
}
