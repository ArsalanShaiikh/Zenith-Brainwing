#!/usr/bin/env bash
# Reindex the 200-frame 360 orbit (even source frames only -> 100 web frames),
# downscale to 1440w and encode webp. Source frame = 2 * output index.
set -euo pipefail
SRC_DIR="/Users/Arsalan/Downloads/360 Orbit/Runwal Zenith"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/orbit"
WIDTH=1440
Q=72
mkdir -p "$OUT_DIR"

gen_one() {
  local idx="$1"
  local src_frame=$(( idx * 2 ))
  local src
  src="$(printf "%s/Runwal Zenith_%05d.jpg" "$SRC_DIR" "$src_frame")"
  local out
  out="$(printf "%s/orbit-%03d.webp" "$OUT_DIR" "$idx")"
  local tmp="/tmp/orbit-$idx.jpg"
  sips -Z "$WIDTH" "$src" --out "$tmp" >/dev/null 2>&1
  cwebp -quiet -q "$Q" "$tmp" -o "$out"
  rm -f "$tmp"
}
export -f gen_one
export SRC_DIR OUT_DIR WIDTH Q

seq 0 99 | xargs -P 8 -I {} bash -c 'gen_one "$@"' _ {}
echo "done: $(ls "$OUT_DIR" | wc -l | tr -d ' ') frames"
du -sh "$OUT_DIR"
