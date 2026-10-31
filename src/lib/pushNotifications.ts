/**
 * Push notifications are not configured for this release.
 *
 * Do not call the native plugin until Firebase, device-token storage, and
 * notification delivery are implemented together. On Android, register() without
 * Firebase throws on the Capacitor plugin thread and kills the process; a JS
 * try/catch cannot recover from that native exception.
 */
export async function initPushNotifications(): Promise<void> {
  // Intentionally disabled on every platform until the complete feature exists.
}
