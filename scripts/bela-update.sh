#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ECD_FILE="${REPO_ROOT}/.bela/bela-update.ecd"
readonly BELA_UPDATER_IMAGE="${BELA_UPDATER_IMAGE:-juxhouse/bela-updater-typescript}"
readonly BELA_SOURCE="${BELA_SOURCE:-${GITHUB_REPOSITORY:-catcaio/projeto-condstore}}"

cd "${REPO_ROOT}"
mkdir -p .bela
rm -f "${ECD_FILE}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Erro: Docker não está instalado ou não está no PATH; o updater oficial do BELA é distribuído como imagem Docker." >&2
  exit 127
fi

if ! docker info >/dev/null 2>&1; then
  echo "Erro: o daemon Docker não está disponível; não foi possível executar o updater BELA." >&2
  exit 125
fi

echo "Executando ${BELA_UPDATER_IMAGE} para a fonte ${BELA_SOURCE}..."
docker run --rm --network=none --pull=always \
  -v "${REPO_ROOT}/.bela:/.bela" \
  -v "${REPO_ROOT}:/workspace:ro" \
  "${BELA_UPDATER_IMAGE}" \
  -source "${BELA_SOURCE}"

if [[ ! -s "${ECD_FILE}" ]]; then
  echo "Erro: o updater terminou sem gerar ${ECD_FILE}." >&2
  exit 1
fi

if ! head -n 1 "${ECD_FILE}" | grep -qx 'v1'; then
  echo "Erro: ${ECD_FILE} não começa com o cabeçalho ECD v1." >&2
  exit 1
fi

if ! head -n 2 "${ECD_FILE}" | tail -n 1 | grep -q '^source '; then
  echo "Erro: ${ECD_FILE} não contém a linha source esperada." >&2
  exit 1
fi

echo "ECD válido gerado em ${ECD_FILE} ($(wc -c < "${ECD_FILE}") bytes)."
