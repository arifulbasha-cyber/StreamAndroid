# CloudStream Drive APK Build Guide

## ⚠️ CRITICAL: Native Auth Setup
This app now uses **Native Android Login**. You MUST configure your Google Console correctly or login will fail with `10: Developer Error`.

### 1. Get SHA-1 Fingerprint
Since you are building in GitHub Actions, you need the SHA-1 of the Release Key.
1. Run the build in GitHub Actions.
2. Open the "Build APK with Gradle" step logs.
3. Look for the "SHA-1 Fingerprint" that I print out in the logs.
4. Copy it (e.g., `DA:39:A3:EE...`).

### 2. Configure Google Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3. Select **Android**.
4. Package name: `com.cloudstream.explorer`
5. SHA-1 Certificate Fingerprint: **Paste the SHA-1 from Step 1**.
6. Click **CREATE**.

## Building the App
Since you don't have Node.js, just **Push your code to GitHub**.
The "Actions" tab will automatically build the APK for you.

Download the `app-release.apk` (or `app-debug.apk`) from the Artifacts section when done.
