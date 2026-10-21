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

# Same build as Rork hosting: on zomitranslator.com the app detects the host
# and calls the Zomi backend directly (see web/src/lib/config.ts).
cd "$ROOT/web"
bunx vite build --outDir "$OUT/site" --emptyOutDir

# Never ship download archives inside the site itself
rm -rf "$OUT/site/downloads"

mv "$OUT/site/cpanel-htaccess.txt" "$OUT/site/.htaccess"
rm -f "$OUT/site/cpanel-index.txt"
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
