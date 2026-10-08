import { CATEGORIES, type Category } from "./scoring";

export type DraftTopic = {
  text: string;
  category: string;
  subjectKey?: string;
  storyKey?: string;
  researchSlot?: string;
  contextSourceUrl?: string;
};

export type ResearchSlot = {
  id: string;
  category: Category | null;
  direction: string;
};

const lanes: Record<Category, string[]> = {
  Entertainment: [
    "Music releases, charts, tours, live performances and music awards",
    "Film releases, box-office milestones, festivals and streaming television",
    "Gaming, esports, comedy and live entertainment events",
    "Television competitions, international entertainment and creator projects",
  ],
  Culture: [
    "Fashion, streetwear, beauty and design launches or public competitions",
    "Internet creators, digital culture and community events with measurable outcomes",
    "Books, visual art, literary prizes and exhibitions",
    "Food, cultural festivals and locally significant public events",
  ],
  Sports: [
    "Basketball, women's sports and international leagues",
    "Soccer, football, rugby and collegiate competitions",
    "Combat sports, tennis, track and field, or motorsport",
    "Cricket, hockey and sports beyond the dominant US championship story",
  ],
  Tech: [
    "Gaming hardware, consumer devices and announced product launch dates",
    "Social platforms, creator tools and public feature rollouts",
    "Robotics, cybersecurity, mobility and technology competitions",
    "Software, developer conferences and technology outside the largest AI companies",
  ],
  Business: [
    "Retail, food, travel and consumer brands with scheduled milestones",
    "Labor negotiations, contract votes and workplace developments",
    "Earnings, company launches and corporate decisions across different industries",
    "Housing, transportation, energy and local business developments",
  ],
  World: [
    "International public events and developments outside the United States",
    "Diplomacy, treaties and scheduled international decisions",
    "Travel, infrastructure and regional milestones in different countries",
    "International institutions and public competitions with official deadlines",
  ],
  Politics: [
    "Local and state elections, ballot measures and legislative votes",
    "Elections and parliamentary decisions outside the United States",
    "Court decisions and public policy deadlines across different jurisdictions",
    "Education, transportation, labor and public services policy",
  ],
  Science: [
    "Medicine, public health and scheduled clinical research milestones",
    "Ecology, wildlife, conservation and environmental decisions",
    "Earth science, oceans and scientific field projects",
    "Energy, materials and public scientific demonstrations outside space launches",
  ],
};

export function normalizeSubject(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Canonicalize common aliases so a changed label cannot evade topic limits.
const aliases: [string, RegExp][] = [
  [
    "mlb postseason",
    /\b(world series|mlb postseason|mlb playoffs|baseball postseason|alcs|nlcs)\b/i,
  ],
  ["donald trump", /\b(trump|donald j\.? trump)\b/i],
  ["nasa", /\b(nasa|artemis|james webb|jwst)\b/i],
  ["tesla", /\b(tesla|cybertruck)\b/i],
  ["apple", /\b(apple|iphone)\b/i],
  ["openai", /\b(openai|chatgpt)\b/i],
  ["bitcoin", /\b(bitcoin|btc)\b/i],
  ["google", /\b(google|alphabet)\b/i],
  ["meta", /\b(meta|facebook|instagram)\b/i],
];
const genericNames = new Set([
  "will",
  "will the",
  "will a",
  "can",
  "could",
  "does",
  "is",
  "are",
  "has",
  "did",
  "the",
  "a",
  "an",
  "yes",
  "no",
  "us",
  "u s",
  "question",
  "team",
  "official",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

export function subjectKeys(topic: DraftTopic) {
  const keys = new Set<string>();
  if (topic.subjectKey) keys.add(normalizeSubject(topic.subjectKey));
  const text = `${topic.text} ${topic.subjectKey || ""}`;
  for (const [key, pattern] of aliases) if (pattern.test(text)) keys.add(key);
  // Recent saved records predate subject metadata. Recover named people,
  // organizations and events from their question text without a migration.
  if (!topic.subjectKey)
    for (const match of topic.text.matchAll(
      /\p{Lu}[\p{L}\p{N}'’.-]*(?:\s+\p{Lu}[\p{L}\p{N}'’.-]*){0,3}/gu,
    )) {
      const key = normalizeSubject(match[0])
        .split(" ")
        .filter((word) => !genericNames.has(word))
        .join(" ");
      if (key.length >= 3 && !genericNames.has(key)) keys.add(key);
    }
  keys.delete("");
  return [...keys];
}

function hash(seed: string) {
  let value = 2166136261;
  for (const char of seed)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function researchPlan(
  count: number,
  totalCount: number,
  offset: number,
  category: string,
  seed: string,
  recent: DraftTopic[],
  accepted: DraftTopic[],
  focus = "",
): ResearchSlot[] {
  const counts = new Map(
    CATEGORIES.map((name) => [
      name,
      recent.slice(0, 40).filter((q) => q.category === name).length,
    ]),
  );
  const order = [...CATEGORIES].sort(
    (a, b) =>
      counts.get(a)! - counts.get(b)! ||
      hash(`${seed}:${a}`) - hash(`${seed}:${b}`),
  );
  const used = new Set(accepted.map((q) => q.researchSlot));
  return Array.from({ length: totalCount }, (_, i) => {
    const selected = (category || order[i % order.length]) as Category;
    const cycle = category ? i : Math.floor(i / order.length);
    return {
      id: `slot-${i}`,
      category: focus && !category ? null : selected,
      direction: focus
        ? `Find distinct current events within the requested topic: ${focus}`
        : lanes[selected][
            (hash(`${seed}:${selected}`) + cycle) % lanes[selected].length
          ],
    };
  })
    .slice(offset)
    .filter((slot) => !used.has(slot.id))
    .slice(0, count);
}

export function saturatedSubjects(recent: DraftTopic[]) {
  const counts = new Map<string, number>();
  for (const topic of recent.slice(0, 40))
    for (const key of subjectKeys(topic))
      counts.set(key, (counts.get(key) || 0) + 1);
  return [...counts].filter(([, count]) => count >= 2).map(([key]) => key);
}

function explicitlyRequested(key: string, focus: string) {
  const requested = normalizeSubject(focus);
  return (
    ` ${requested} `.includes(` ${key} `) ||
    aliases.some(
      ([canonical, pattern]) => canonical === key && pattern.test(focus),
    )
  );
}

export function diversityIssue(
  draft: DraftTopic,
  plan: ResearchSlot[],
  recent: DraftTopic[],
  previous: DraftTopic[],
  accepted: DraftTopic[],
  focus: string,
): string | null {
  const slot = plan.find((slot) => slot.id === draft.researchSlot);
  if (!slot || (slot.category && draft.category !== slot.category))
    return "A draft did not follow its assigned research topic.";
  if (
    !draft.subjectKey?.trim() ||
    draft.subjectKey.length > 120 ||
    !draft.storyKey?.trim() ||
    draft.storyKey.length > 200
  )
    return "A draft lacked a clear subject or event identity.";
  if (accepted.some((q) => q.researchSlot === draft.researchSlot))
    return "A draft reused a research slot.";
  const keys = subjectKeys(draft);
  const repeated = new Set([...previous, ...accepted].flatMap(subjectKeys));
  const saturated = new Set(saturatedSubjects(recent));
  if (
    keys.some(
      (key) =>
        (repeated.has(key) || saturated.has(key)) &&
        !explicitlyRequested(key, focus),
    )
  )
    return "A repeated or recently overrepresented subject was skipped.";
  const story = normalizeSubject(draft.storyKey);
  if (
    [...previous, ...accepted].some(
      (q) => q.storyKey && normalizeSubject(q.storyKey) === story,
    )
  )
    return "A repeated event was skipped.";
  // One article should not be turned into several differently worded cards.
  if (
    !keys.some((key) => explicitlyRequested(key, focus)) &&
    draft.contextSourceUrl &&
    [...previous, ...accepted].some(
      (q) => q.contextSourceUrl === draft.contextSourceUrl,
    )
  )
    return "A reused current-events story was skipped.";
  return null;
}
