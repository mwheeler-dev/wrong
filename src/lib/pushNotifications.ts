// Push notification groundwork — Capacitor wiring only, no backend yet.
//
// BEFORE this can drive real campaigns in production you still need:
//   1. Firebase project + google-services.json placed at
//      android/app/google-services.json (NOT committed).
//   2. com.google.gms.google-services Gradle plugin enabled in android/.
//   3. A POST endpoint on the Next.js side (e.g. /api/devices/register)
//      that stores `{ userId, fcmToken, platform }` keyed by user. The
//      `onRegistration` callback below currently just logs the token.
//   4. A notification campaign runner (server-side cron / queue) that
//      reads stored tokens and calls FCM's HTTP v1 API.
//
// Until those exist, calling `initPushNotifications()` is harmless: on web
// it no-ops; on Android the user sees a permission prompt and the token
// is logged to the console for collection during dev/testing.

import { isNative } from "./native";

let initialized = false;

export async function initPushNotifications(): Promise<void> {
  if (!isNative()) return;
  if (initialized) return;
  initialized = true;

  // Dynamic import so the plugin code never reaches the browser bundle
  // when running on the web. On Android it resolves to the Capacitor
  // bridge implementation.
  let PushNotifications: typeof import("@capacitor/push-notifications").PushNotifications;
  try {
    ({ PushNotifications } = await import("@capacitor/push-notifications"));
  } catch (err) {
    console.warn("[push] plugin import failed", err);
    return;
  }

  try {
    const perm = await PushNotifications.checkPermissions();
    let state = perm.receive;

    if (state === "prompt" || state === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      state = req.receive;
    }

    if (state !== "granted") {
      console.info("[push] permission not granted:", state);
      return;
    }

    // Listeners — must be added before register() so we don't miss the
    // initial 'registration' event on faster devices.
    await PushNotifications.addListener("registration", (token) => {
      // TODO: POST token.value to /api/devices/register once that route
      // and Firebase/FCM credentials are in place. For now we just log.
      console.info("[push] device token:", token.value);
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error:", err);
    });

    await PushNotifications.addListener("pushNotificationReceived", (notif) => {
      // Fires while app is in foreground. We currently let the system
      // show nothing and just log — wiring a custom in-app toast is a
      // follow-up once the design exists.
      console.info("[push] received:", notif);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      // Fires when the user taps a notification. Hook deep-link routing
      // here once campaigns are live (e.g. open /play or /dashboard).
      console.info("[push] action:", action);
    });

    await PushNotifications.register();
  } catch (err) {
    console.warn("[push] init failed", err);
  }
}
