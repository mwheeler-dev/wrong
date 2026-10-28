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
    "Music releases, tours and chart races across different artists, genres and countries; research beyond the most-covered pop star",
    "Upcoming films, box-office races and TV shows that viewers are following",
    "New games, esports matches, comedy and live shows with an audience waiting for the outcome",
    "TV competitions, international music scenes and creator projects with clear public interest",
  ],
  Culture: [
    "Fashion, streetwear, beauty and design launches or public competitions",
    "Internet creators, digital culture and community events with measurable outcomes",
    "Books, art and cultural releases with a story ordinary readers can follow",
    "Food, festivals and public events people are actually excited about",
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
    "Games, apps and useful new technology beyond the largest AI companies",
  ],
  Business: [
    "Stores, restaurants, travel and consumer brands people use, with a clear upcoming change",
    "Labor negotiations, contract votes and workplace developments",
    "New products, prices and business decisions with a clear impact on customers",
    "Housing, transportation and energy changes with everyday stakes",
  ],
  World: [
    "International public events and developments outside the United States",
    "International decisions with clear consequences for ordinary people",
    "Travel, infrastructure and regional milestones in different countries",
    "Major international events and travel developments people are following; avoid routine committee elections",
  ],
  Politics: [
    "Local and state elections, ballot measures and legislative votes",
    "Elections and parliamentary decisions outside the United States",
    "Court decisions and public policy deadlines across different jurisdictions",
    "Education, transportation, labor and public services policy",
  ],
  Science: [
    "Vaccines, treatments and public-health developments with a clear everyday outcome; avoid trial-reporting jargon",
    "Ecology, wildlife, conservation and environmental decisions",
    "Earth, oceans and discoveries whose stakes are understandable without specialist training",
    "Energy, useful inventions and public science demonstrations beyond space launches",
  ],
};

export function normalizeSubject(value: string) {
  return value
    .replace(/['’]s\b/gi, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Canonicalize common aliases so a changed label cannot evade topic limits.
const aliases: [string, RegExp][] = [
  ["taylor swift", /\b(taylor\s+swift|(?:the\s+)?eras tour|swifties)\b|\bswift['’]s\b/i],
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
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  "today", "tonight", "tomorrow", "this", "next", "new", "first", "last",
  "by", "before", "after", "game", "match", "album", "single", "tour",
  "film", "movie", "episode", "season", "launch", "release", "price",
]);

export function subjectKeys(topic: DraftTopic) {
  const keys = new Set<string>();
  if (topic.subjectKey) keys.add(normalizeSubject(topic.subjectKey));
  const text = `${topic.text} ${topic.subjectKey || ""}`;
  for (const [key, pattern] of aliases) if (pattern.test(text)) keys.add(key);
  // Check the actual named subjects even when the model supplies metadata.
  // This also covers saved records predating metadata. Album, tour and chart
  // labels must not hide the artist.
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
  // Default batches prioritize broad, socially relevant topics rather than
  // treating every editorial category as equally interesting to players.
  // Explicit category/focus requests retain their existing behavior.
  const audienceLanes: { category: Category; direction: string }[] = [
    { category: "Entertainment", direction: "Current viral music, artists, streaming series, celebrities or creators with a real upcoming uncertain outcome" },
    { category: "Culture", direction: "Current internet culture, fashion, social trends, creators or widely discussed pop culture" },
    { category: "Entertainment", direction: "Popular films, albums, streaming releases or creator rivalries people aged 18–30 are discussing" },
    { category: "Culture", direction: "Viral online conversations or cultural moments with objectively measurable upcoming outcomes" },
    { category: "Sports", direction: "Major current sports matchups, combat sports or athlete rivalries people actively discuss" },
    { category: "Sports", direction: "Popular sports, esports or gaming competitions with clear uncertain outcomes" },
    { category: "Tech", direction: "Gaming, consumer tech or social apps that everyday users care about, not corporate investor milestones" },
    { category: "Politics", direction: "Widely discussed politics or public decisions with immediate real-world consequences" },
    { category: "World", direction: "Major global developments actively discussed by the public, not administrative announcements" },
    { category: "Science", direction: "Widely discussed science, health, space or wildlife discoveries with accessible public stakes" },
  ];
  const used = new Set(accepted.map((q) => q.researchSlot));
  return Array.from({ length: totalCount }, (_, i) => {
    const selected = (category || (focus ? order[i % order.length] : audienceLanes[(i + hash(seed) % audienceLanes.length) % audienceLanes.length].category)) as Category;
    const cycle = category ? i : Math.floor(i / order.length);
    return {
      id: `slot-${i}`,
      category: focus && !category ? null : selected,
      direction: focus
        ? `Find distinct current events within the requested topic: ${focus}`
        : !category
          ? audienceLanes[(i + hash(seed) % audienceLanes.length) % audienceLanes.length].direction
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
  for (const topic of recent.slice(0, 150))
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

