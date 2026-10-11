#!/usr/bin/env bash
# Assemble the Qollab project (qollab/package/) and zip it for upload.
#
#   qollab/package/
#     index.html  main.js  host.js       the page + Qollab entry + API host
#     assets/app.js  assets/index.css    the game, built from frontend/ (relative paths)
#     ocean/__init__.py quantum.py bridge.py   Qiskit core + JSON bridge (in-browser Python)
#     main.py                            the text-mode fallback (python main.py)
#     README.md  LICENSE
#
# Usage: ./qollab/build.sh [/path/to/output.zip]   (default: ~/Desktop/Grovers-Ocean-Qollab.zip)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/qollab/package"
OUT="${1:-$HOME/Desktop/Grovers-Ocean-Qollab.zip}"

rm -rf "$PKG"
mkdir -p "$PKG"

echo "▸ building the game with relative asset paths"
(cd "$ROOT/frontend" && ./node_modules/.bin/vite build --mode qollab --logLevel warn)

echo "▸ assembling package"
cp "$ROOT/qollab/index.html" "$ROOT/qollab/main.js" "$ROOT/qollab/host.js" "$ROOT/qollab/config.js" "$PKG/"
cp "$ROOT/qollab/README.md" "$PKG/README.md"
cp "$ROOT/LICENSE" "$ROOT/main.py" "$PKG/"
mkdir -p "$PKG/ocean"
cp "$ROOT/backend/quantum.py" "$PKG/ocean/quantum.py"   # always the live copy
cp "$ROOT/qollab/ocean/__init__.py" "$ROOT/qollab/ocean/bridge.py" "$PKG/ocean/"
cp "$ROOT/backend/quantum.py" "$ROOT/qollab/ocean/quantum.py"  # keep the repo copy in sync too
rm -f "$PKG/assets/index.html"

echo "▸ zipping → $OUT"
rm -f "$OUT"
(cd "$PKG" && zip -qr9 "$OUT" .)
ls -la "$OUT"
unzip -l "$OUT" | tail -1
