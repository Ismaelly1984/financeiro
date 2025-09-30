#!/usr/bin/env bash
set -euo pipefail

# Substitui ocorrências de example.com em sitemap.xml pelo domínio fornecido.
# Uso: ./scripts/replace-domain.sh meufinanceiro.com
# Pode receber com ou sem protocolo (https://)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SITEMAP="$ROOT_DIR/sitemap.xml"

if [ ! -f "$SITEMAP" ]; then
  echo "Erro: sitemap.xml não encontrado em $ROOT_DIR"
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <domínio>  (ex: meufinanceiro.com ou https://meufinanceiro.com)"
  exit 1
fi

INPUT="$1"
# remove trailing slash
INPUT="${INPUT%/}"
# garante protocolo
if [[ "$INPUT" != http*://* ]]; then
  DOMAIN_WITH_PROTO="https://$INPUT"
else
  DOMAIN_WITH_PROTO="$INPUT"
fi
DOMAIN_NO_PROTO="${DOMAIN_WITH_PROTO#*://}"

# escape strings para sed
escape_for_sed() { printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'; }
ESC_PROTO=$(escape_for_sed "$DOMAIN_WITH_PROTO")
ESC_NO_PROTO=$(escape_for_sed "$DOMAIN_NO_PROTO")

# Substitui ocorrências (com/sem protocolo)
# Primeiro substitui com protocolo, depois sem.
sed -i -e "s|https://example.com|$ESC_PROTO|g" \
       -e "s|http://example.com|$ESC_PROTO|g" \
       -e "s|example.com|$ESC_NO_PROTO|g" "$SITEMAP"

echo "Sitemap atualizado: $SITEMAP"
echo "Substituído example.com por $DOMAIN_WITH_PROTO"
