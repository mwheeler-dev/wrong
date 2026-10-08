// Railway terminates HTTPS before forwarding to Next.js. req.url can therefore
// use the internal container origin; compare against the external host instead.
export function hasSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    if (!["https:", "http:"].includes(source.protocol) || source.origin !== origin)
      return false;
    const host =
      req.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      req.headers.get("host") ||
      new URL(req.url).host;
    return source.host === host.toLowerCase();
  } catch {
    return false;
  }
}
