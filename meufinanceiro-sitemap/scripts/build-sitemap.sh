#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_DIR="$ROOT_DIR/src"
OUT_FILE="$ROOT_DIR/../sitemap.xml"

cd "$SRC_DIR"

node index.js

# Generated file path from generator defaults to src/../sitemap.xml (root of meufinanceiro-sitemap)
# Move to parent repository root (one level above meufinanceiro-sitemap)
if [ -f "$ROOT_DIR/sitemap.xml" ]; then
  mv -f "$ROOT_DIR/sitemap.xml" "$OUT_FILE"
  echo "Sitemap movido para: $OUT_FILE"
else
  echo "Arquivo sitemap.xml não encontrado em $ROOT_DIR"
  exit 1
fi

echo "Sitemap gerado com sucesso!"