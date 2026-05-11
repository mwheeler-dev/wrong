import { clearSession } from "@/lib/session";

// Sign-out works for both POST (from the nav form) and GET (direct link, or
// any reason the browser falls back to GET). In both cases:
//   1. clear the auth cookie
//   2. respond with a 303 redirect to "/"
//
// We intentionally do NOT use NextResponse.redirect(new URL("/", req.url)).
// Behind a reverse proxy (Railway, Vercel, etc.) `req.url` can resolve to the
// internal origin (http://0.0.0.0:PORT/...), which the browser cannot reach,
// causing the page to appear to "crash" after sign-out. A relative Location
// header is resolved against the original request URL by every modern browser
// per RFC 7231, so it's safe and proxy-proof.
function redirectHome(): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: "/" },
  });
}

export async function POST(): Promise<Response> {
  clearSession();
  return redirectHome();
}

export async function GET(): Promise<Response> {
  clearSession();
  return redirectHome();
}
