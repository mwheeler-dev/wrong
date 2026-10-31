"use client";

import { useEffect } from "react";
import { configureStatusBar, hideSplash, isNative } from "@/lib/native";
import { initAppLifecycle } from "@/lib/appLifecycle";

/**
 * Mounts once at the root of the app to configure status bar, dismiss the
 * native splash after first paint,
 * and attach lifecycle listeners. All operations no-op on the web — see
 * the safety contract documented in src/lib/native.ts.
 */
export function NativeBootstrap() {
  useEffect(() => {
    if (!isNative()) return;

    let disposeLifecycle: (() => void) | null = null;

    (async () => {
      await configureStatusBar();
      await hideSplash();
      disposeLifecycle = await initAppLifecycle();
    })();

    return () => {
      disposeLifecycle?.();
    };
  }, []);

  return null;
}
