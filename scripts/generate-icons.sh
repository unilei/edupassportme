#!/bin/bash
# Generate PWA icons from SVG source
# Requires: rsvg-convert (librsvg) or Inkscape
# On macOS: brew install librsvg
# Usage: ./scripts/generate-icons.sh

set -euo pipefail

SVG="public/icons/icon-192.svg"
OUT="public/icons"

if command -v rsvg-convert &>/dev/null; then
  rsvg-convert -w 192 -h 192 "$SVG" > "$OUT/icon-192.png"
  rsvg-convert -w 512 -h 512 "$SVG" > "$OUT/icon-512.png"
  echo "✅ Icons generated in $OUT"
elif command -v sips &>/dev/null; then
  # macOS fallback: convert SVG with sips (limited)
  echo "⚠️  sips doesn't support SVG. Install librsvg: brew install librsvg"
  echo "Or use an online tool to convert public/icons/icon-192.svg to PNG."
  exit 1
else
  echo "❌ No SVG converter found. Install librsvg or convert manually."
  exit 1
fi
