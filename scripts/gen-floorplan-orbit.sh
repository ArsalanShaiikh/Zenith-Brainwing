#!/usr/bin/env bash
# Reindex the 200-frame floorplan turntable (even source frames only -> 100 web
# frames), downscale to 1440w and encode webp. Source frame = 2 * output index.
#
# This is the *stabilised* revolve: the camera holds its height instead of
# rising and falling the way the landing orbit does, so the tower turns flat.
# It shares exactly two poses with the landing orbit — source 0 is the frontal
# elevation (= orbit-000) and source 100 the three-quarter (= orbit-040), both
# verified as pixel-aligned. Those are the seams the two sets hand over on, and
# they are the frames the floor-plate SVGs are traced against, so they must
# survive the halving: 0 and 100 are even, landing on web frames 0 and 50.
#
# Mirrors gen-orbit.sh (same width and quality) so the two sets sit at the same
# weight. Note the source render is 1916x1080 against the landing orbit's
# 3840x2160, so these frames carry roughly half the detail — that difference is
# what the cross-dissolve at the seam is covering.
set -euo pipefail
SRC_DIR="/Users/Arsalan/Downloads/Floor plans"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/floorplan-orbit"
WIDTH=1440
Q=72
mkdir -p "$OUT_DIR"

gen_one() {
  local idx="$1"
  local src_frame=$(( idx * 2 ))
  local src
  src="$(printf "%s/Floor plans_%05d.jpg" "$SRC_DIR" "$src_frame")"
  local out
  out="$(printf "%s/fp-%03d.webp" "$OUT_DIR" "$idx")"
  local tmp="/tmp/fp-orbit-$idx.jpg"
  sips -Z "$WIDTH" "$src" --out "$tmp" >/dev/null 2>&1
  cwebp -quiet -q "$Q" "$tmp" -o "$out"
  rm -f "$tmp"
}
export -f gen_one
export SRC_DIR OUT_DIR WIDTH Q

seq 0 99 | xargs -P 8 -I {} bash -c 'gen_one "$@"' _ {}
echo "done: $(ls "$OUT_DIR" | wc -l | tr -d ' ') frames"
du -sh "$OUT_DIR"
