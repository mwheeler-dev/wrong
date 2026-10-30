# Android Play resubmission: connection reset

Google's October 30 evidence shows the app's top-level WebView failing to load
https://www.wrong-app.com/ with net::ERR_CONNECTION_RESET. The generic policy
label mentions unresponsive controls; the attached evidence is a network failure.
The screenshot does not establish whether the reset came from hosting, the
reviewer's network, or the device.

## Change prepared

MainActivity retains Capacitor's BridgeWebViewClient and plugin/navigation behavior.
Main-frame connection, DNS, timeout, I/O, and HTTP 5xx failures display a native
recovery panel and retry after 1, 3, and 7 seconds. A working navigation hides it.
Subresource failures do not cover the app. The user can retry manually after the
automatic attempts stop. Only the configured HTTPS host is retried; certificate
validation is unchanged. App version is 1.0.1 (versionCode 2).

This improves recovery but does not make the online game work offline or prove
that Google's original network failure is permanently resolved.

## Build on the existing Windows signing machine

The original signed versionCode 1 bundle was built in C:\Users\marqu\wrong.
Keep the existing upload keystore and gitignored signing properties there.
Use Android Studio's bundled JBR (Java 21 or newer), as for the original build.

After checking out this change:

```powershell
cd C:\Users\marqu\wrong
npm ci
# Keep Capacitor's generated assets and plugin registration in sync.
# webDir is out; it must exist, even though this shell loads the live website.
New-Item -ItemType Directory -Force out | Out-Null
if (!(Test-Path out\index.html)) { Set-Content out\index.html '<!doctype html><title>Wrong.</title>' }
npx cap sync android
cd android
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

The signed upload bundle is:
C:\Users\marqu\wrong\android\app\build\outputs\bundle\release\app-release.aab

If versionCode 2 has since been uploaded, increment to the next unused code
before building. Do not upload the old versionCode 1 bundle again.

## Required device verification before submitting

1. Install the updated build on a physical Android phone. Cold-launch over Wi-Fi
   and mobile data; verify the homepage, sign-in, navigation, gameplay, and back.
2. Force-stop the app, enable airplane mode, then launch. The native recovery
   panel should appear and automatic retries should stop after three attempts.
3. Restore connectivity, tap Try again, and verify that the real homepage loads
   and all controls work. Repeat with a failed navigation inside the app.
4. Make a subresource fail (for example an image request); confirm that the
   recovery panel does not hide an otherwise functioning page.
5. Install via a Play internal testing release too; inspect its pre-launch report.
   A browser HTTP 200 alone does not validate the installed Android app.

## Submit the replacement

Create an updated production release in Play Console with this signed AAB.
Ensure reviewer access instructions still work, resolve any pre-launch failures,
then send the changes for review from Publishing overview.

Only after testing, describe the actual work in review notes, for example:
"Updated Android startup connection handling with bounded retries and a native
retry screen. Verified cold launch, sign-in, gameplay and connection recovery
on [device/Android version] over [networks]."

Do not claim those device tests passed until they have been performed. A retry
screen alone is not evidence that the app's core functions pass review.

## Checks performed in the coding environment

- Production hostname returned HTTP 200, including with an Android WebView user agent.
- Railway reported propagated DNS and a valid certificate for www.wrong-app.com.
- Native changes checked against the installed Capacitor 8 source APIs.
- Gradle build could not start: this environment cannot download the Gradle
  distribution (Network is unreachable), has Java 17 and no Android SDK or upload
  signing key. No APK/AAB or Android runtime test is claimed here.
