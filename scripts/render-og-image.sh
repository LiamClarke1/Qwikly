#!/usr/bin/env bash
# Render public/og-image.svg -> public/og-image.png at 1200x630.
#
# Uses sharp (Node) for SVG-to-PNG rasterisation. sharp is intentionally NOT in
# package.json — it's only needed when regenerating the OG image, which happens
# rarely and the rendered PNG is committed to the repo. The first run installs
# sharp into a sibling cache dir; subsequent runs reuse it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${ROOT_DIR}/public/og-image.svg"
OUT="${ROOT_DIR}/public/og-image.png"
CACHE="${HOME}/.cache/qwikly-og-render"

if [[ ! -f "${SRC}" ]]; then
  echo "missing ${SRC}" >&2
  exit 1
fi

if [[ ! -d "${CACHE}/node_modules/sharp" ]]; then
  echo "first run: installing sharp into ${CACHE}"
  mkdir -p "${CACHE}"
  ( cd "${CACHE}" && npm init -y >/dev/null && npm install --silent sharp@^0.34.0 )
fi

node - "${SRC}" "${OUT}" "${CACHE}/node_modules/sharp" <<'JS'
const [src, out, sharpPath] = process.argv.slice(2);
const sharp = require(sharpPath);

sharp(src, { density: 300 })
  .resize(1200, 630, { fit: 'fill' })
  .png({ compressionLevel: 9 })
  .toFile(out)
  .then(info => console.log(`wrote ${out} (${info.size} bytes)`))
  .catch(err => { console.error(err); process.exit(1); });
JS
