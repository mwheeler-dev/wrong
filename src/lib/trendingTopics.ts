// Live discovery signals, not evidence that a prediction has resolved.
// Every network request is bounded; unavailable feeds never block manual drafts.
export type TrendingTopic = {
  title: string;
  source: "Google Trends" | "GDELT" | "YouTube";
  region: string;
  url: string;
};
const regions = ["US", "GB", "IN", "BR", "JP", "ZA", "NG", "AU"];
const unescapeXml = (value: string) =>
  value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").trim();
const xmlValue = (item: string, tag: string) =>
  unescapeXml(item.match(new RegExp("<(?:[a-z]+:)?" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-z]+:)?" + tag + ">", "i"))?.[1] || "");
async function load(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(6500),
    headers: { "User-Agent": "WrongApp-TrendDiscovery/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Trend feed unavailable: " + response.status);
  return response.text();
}
async function googleTrends(region: string): Promise<TrendingTopic[]> {
  const xml = await load("https://trends.google.com/trending/rss?geo=" + region);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 12)
    .map((match) => ({
      title: xmlValue(match[1], "title"),
      source: "Google Trends" as const,
      region,
      url: xmlValue(match[1], "link") || "https://trends.google.com/trending?geo=" + region,
    })).filter((topic) => topic.title.length > 2);
}
async function gdelt(): Promise<TrendingTopic[]> {
  const params = new URLSearchParams({
    query: "(entertainment OR sports OR music OR gaming OR election OR science)",
    mode: "ArtList", maxrecords: "35", format: "json", sort: "DateDesc",
    timespan: "24h",
  });
  const data = JSON.parse(await load("https://api.gdeltproject.org/api/v2/doc/doc?" + params)) as {
    articles?: { title?: string; url?: string; sourcecountry?: string }[];
  };
  return (data.articles || []).filter((a) => a.title && /^https?:\/\//.test(a.url || ""))
    .map((a) => ({
      title: a.title!, source: "GDELT" as const,
      region: a.sourcecountry || "Global", url: a.url!,
    }));
}
async function youtube(region: string, key: string): Promise<TrendingTopic[]> {
  const params = new URLSearchParams({
    part: "snippet", chart: "mostPopular", regionCode: region,
    maxResults: "12", key,
  });
  const data = JSON.parse(await load("https://www.googleapis.com/youtube/v3/videos?" + params)) as {
    items?: { id?: string; snippet?: { title?: string } }[];
  };
  return (data.items || []).filter((v) => v.id && v.snippet?.title)
    .map((v) => ({
      title: v.snippet!.title!, source: "YouTube" as const,
      region, url: "https://www.youtube.com/watch?v=" + encodeURIComponent(v.id!),
    }));
}
export async function discoverTrendingTopics(): Promise<TrendingTopic[]> {
  const jobs: Promise<TrendingTopic[]>[] = [
    ...regions.map((region) => googleTrends(region)),
    gdelt(),
  ];
  // Optional API key: never expose it to the browser or require it for generation.
  if (process.env.YOUTUBE_DATA_API_KEY)
    jobs.push(...["US", "GB", "IN", "BR", "JP"].map((region) =>
      youtube(region, process.env.YOUTUBE_DATA_API_KEY!)));
  const results = await Promise.allSettled(jobs);
  const seen = new Set<string>();
  const topics: TrendingTopic[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const topic of result.value) {
      const normalized = topic.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      topics.push(topic);
    }
  }
  return topics.slice(0, 90);
}
