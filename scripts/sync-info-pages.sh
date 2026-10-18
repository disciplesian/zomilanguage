#!/usr/bin/env bash
# Copies the single source of truth for About / Privacy / Terms / Help
# (content/info-pages.json) into every app, so all apps and the website show
# the same text and it is readable offline.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/content/info-pages.json"

cp "$SRC" "$ROOT/ios/ZomiTranslator/info-pages.json"
mkdir -p "$ROOT/android/app/src/main/assets"
cp "$SRC" "$ROOT/android/app/src/main/assets/info-pages.json"
mkdir -p "$ROOT/web/src/content"
cp "$SRC" "$ROOT/web/src/content/info-pages.json"
cp "$SRC" "$ROOT/expo/constants/infoPages.json"
echo "info pages synced to ios, android, web, expo"

# Interface strings (English → Zomi) for the Zomi/English language switch.
UI="$ROOT/content/ui-strings.json"
cp "$UI" "$ROOT/ios/ZomiTranslator/ui-strings.json"
cp "$UI" "$ROOT/android/app/src/main/assets/ui-strings.json"
cp "$UI" "$ROOT/web/src/content/ui-strings.json"
cp "$UI" "$ROOT/expo/constants/uiStrings.json"
echo "ui strings synced to ios, android, web, expo"
