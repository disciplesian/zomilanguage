#!/usr/bin/env bash
# Renders the Android app's real screens to PNG (Robolectric native graphics)
# for the Google Play listing, then copies them into play-store/listing.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/android/app/build/store-screenshots"
rm -rf "$OUT"
cd "$ROOT/android"
./gradlew :app:testDebugUnitTest --tests "com.rork.zomilanguageportal.StoreScreenshots" --stacktrace
ls -la "$OUT"
