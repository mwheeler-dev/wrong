// App-level lifecycle hooks via Capacitor's App plugin.
//
// Important: we deliberately DO NOTHING with the active question timer on
// resume. The countdown in <Timer> is bound to an absolute deadline
// persisted in sessionStorage (see src/lib/questionTimer.ts); tab-switches
// and backgrounding must NOT reset it. That's the same invariant the web
// timer already enforces — this file extends it to the Android shell.

import { isNative } from "./native";

type Unsubscribe = () => void;

export async function initAppLifecycle(): Promise<Unsubscribe> {
  if (!isNative()) return () => {};

  let App: typeof import("@capacitor/app").App;
  try {
    ({ App } = await import("@capacitor/app"));
  } catch (err) {
    console.warn("[lifecycle] plugin import failed", err);
    return () => {};
  }

  const handles: { remove: () => Promise<void> }[] = [];

  try {
    handles.push(
      await App.addListener("appStateChange", (state) => {
        // state.isActive: true on resume, false on pause. We log only —
        // the question timer recovers from sessionStorage automatically
        // because <Timer> reads `deadline - Date.now()` on every visibility
        // regain. Adding a reset here would re-introduce the bug we just
        // fixed (commit 23cbdb7 / a19cade).
        console.info("[lifecycle] active:", state.isActive);
      }),
    );

    handles.push(
      await App.addListener("backButton", ({ canGoBack }) => {
        // Default Capacitor behavior is fine; we just observe so we can
        // wire deep-link / nav behavior here later if needed.
        console.info("[lifecycle] back button, canGoBack:", canGoBack);
      }),
    );
  } catch (err) {
    console.warn("[lifecycle] listener attach failed", err);
  }

  return () => {
    for (const h of handles) {
      h.remove().catch(() => {});
    }
  };
}
