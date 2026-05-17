// Font loader for Satori (`next/og` ImageResponse).
// Satori cannot pull fonts from the browser — it needs raw ArrayBuffers.
// We grab Inter from Google Fonts and cache it per-process to avoid
// re-downloading on every request.

type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;

type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal";
};

let cache: Promise<LoadedFont[]> | null = null;

async function fetchGoogleFont(family: string, weight: FontWeight): Promise<ArrayBuffer> {
  // The default Google Fonts CSS endpoint serves WOFF2 to modern browsers,
  // but Satori needs TTF/OTF. A "legacy" user-agent string gets us TTF.
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&display=swap`;
  const css = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko)",
    },
  }).then((r) => r.text());

  const match = css.match(/src:\s*url\((https:[^)]+?)\)\s*format\('(truetype|opentype)'\)/);
  if (match) {
    return fetch(match[1]).then((r) => r.arrayBuffer());
  }
  // Fallback: take the first url() we find (likely WOFF2 — Satori sometimes
  // tolerates it depending on version)
  const any = css.match(/src:\s*url\((https:[^)]+?)\)/);
  if (!any) throw new Error(`Could not extract font URL from Google CSS for ${family} ${weight}`);
  return fetch(any[1]).then((r) => r.arrayBuffer());
}

export function loadCardFonts(): Promise<LoadedFont[]> {
  if (cache) return cache;
  cache = (async () => {
    const [black, bold, regular] = await Promise.all([
      fetchGoogleFont("Inter", 900),
      fetchGoogleFont("Inter", 700),
      fetchGoogleFont("Inter", 500),
    ]);
    return [
      { name: "Inter", data: black, weight: 900, style: "normal" },
      { name: "Inter", data: bold, weight: 700, style: "normal" },
      { name: "Inter", data: regular, weight: 500, style: "normal" },
    ];
  })();
  return cache;
}
