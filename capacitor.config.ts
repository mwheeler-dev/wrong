import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: server.url points the Android shell at the live Railway
// deployment. Do NOT change this domain — see docs/android-native.md.
// The web build is otherwise unaffected; everything in this config is
// only read by the native shell at sync/build time.

const config: CapacitorConfig = {
  appId: 'com.wrongapp.mobile',
  appName: 'Wrong.',
  webDir: 'out',
  server: {
    url: 'https://www.wrong-app.com',
    cleartext: false
  },
  android: {
    // White system background so the splash transition and pull-to-refresh
    // overscroll color don't flash a dark frame against our paper UI.
    backgroundColor: '#FFFFFF'
  },
  plugins: {
    SplashScreen: {
      // Short cap — the live site loads quickly over a warm cache, and a
      // 2s ceiling avoids the "stuck on logo" feeling if the network is
      // hostile. We also call SplashScreen.hide() explicitly from
      // NativeBootstrap after first paint.
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    }
  }
};

export default config;
