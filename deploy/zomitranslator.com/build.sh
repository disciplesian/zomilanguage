#!/usr/bin/env bash
# Builds the static Zomi Translator website as a cPanel-ready zip for
# zomitranslator.com's public_html. Run from the project root:
#   bash deploy/zomitranslator.com/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/deploy/zomitranslator.com"
STAMP="$(date +%Y-%m-%d)"
OUT="$(mktemp -d)"
NAME="zomitranslator-public_html-$STAMP.zip"

# Off Rork hosting there is no /~api proxy, so call the Zomi backend directly
# (its CORS list already allows zomitranslator.com).
cd "$ROOT/web"
# Sign-in only works on Rork-hosted addresses, so the buttons open the official site.
VITE_RORK_API_BASE_URL="https://zomilanguage-backend.rork.app" \
VITE_SIGN_IN_HOME="https://zomilanguage.rork.app" \
  bunx vite build --outDir "$OUT/site" --emptyOutDir

# Never ship download archives inside the site itself
rm -rf "$OUT/site/downloads"

cp "$HERE/htaccess.txt" "$OUT/site/.htaccess"
cp "$HERE/UPLOAD-GUIDE.txt" "$OUT/site/UPLOAD-GUIDE.txt"

mkdir -p "$ROOT/web/public/downloads"
rm -f "$ROOT/web/public/downloads/"zomitranslator-public_html-*.zip
python3 - "$OUT/site" "$ROOT/web/public/downloads/$NAME" <<'PY'
import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(src):
        for f in sorted(files):
            full = os.path.join(base, f)
            z.write(full, os.path.relpath(full, src))
PY

echo "Built web/public/downloads/$NAME"
unzip -l "$ROOT/web/public/downloads/$NAME" | tail -n 1
