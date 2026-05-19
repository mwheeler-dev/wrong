// Capacitor native bridge — safe for web/SSR.
//
// Wrong. is served from Next.js (Railway) and *also* loaded by the Android
// Capacitor shell via server.url. The same client bundle runs in both: a
// plain browser (no Capacitor bridge) and the native WebView (bridge
// injected). Every helper here must therefore:
//   1. no-op on SSR (typeof window === "undefined")
//   2. no-op in the plain browser (Capacitor.isNativePlatform() === false)
//   3. swallow plugin errors instead of throwing — the web app must never
//      break because a native plugin is unhappy.
//
// Public surface: a small set of haptic/status-bar helpers callers can fire
// optimistically from React without guarding the platform themselves.

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

export function isNative(): boolean {
  try {
    return typeof window !== "undefined" && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// ── Haptics ────────────────────────────────────────────────────────────
// All haptic helpers are fire-and-forget. We never await the result in UI
// code — a slow buzz must not block a re-render.

export function hapticLight(): void {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function hapticMedium(): void {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export function hapticHeavy(): void {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}

export function hapticSuccess(): void {
  if (!isNative()) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export function hapticWarning(): void {
  if (!isNative()) return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

export function hapticError(): void {
  if (!isNative()) return;
  Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}

export function hapticSelection(): void {
  if (!isNative()) return;
  Haptics.selectionChanged().catch(() => {});
}

// ── Status bar ─────────────────────────────────────────────────────────
// The site has a white background, so we want a LIGHT status bar with
// DARK icons. Style.Light = "content style for a light background"
// (i.e. dark glyphs). Style.Dark = light glyphs on a dark background.
//
// We deliberately do NOT enable overlay — the web layout already manages
// its own header; overlaying would put the system clock on top of the nav.

export async function configureStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#FFFFFF" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // older Android versions / missing plugin → ignore
  }
}

// ── Splash ─────────────────────────────────────────────────────────────
// We let the native splash auto-hide via the Capacitor config (see
// capacitor.config.ts → SplashScreen.launchAutoHide). This helper exists
// so callers can also dismiss it explicitly after first paint — useful if
// the web bundle takes longer than the configured cap.

export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    await SplashScreen.hide();
  } catch {
    // plugin unavailable → ignore
  }
}
