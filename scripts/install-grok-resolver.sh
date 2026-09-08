#!/usr/bin/env bash
# Copia el helper a ~/.molpo y lo deja corriendo como LaunchAgent.
set -euo pipefail

LABEL="ar.molpo.resolver"
HOME_MOLPO="${HOME}/.molpo"
DEST="${HOME_MOLPO}/resolver.mjs"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
UID_NUM="$(id -u)"
DOMAIN="gui/${UID_NUM}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/scripts/grok-resolver.mjs"

xml() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
}

uninstall() {
  launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
  launchctl unload "${PLIST}" 2>/dev/null || true
  rm -f "${PLIST}"
  echo "Helper frenado. El mapa en ${HOME_MOLPO}/proyectos.json queda."
}

if [[ "${1:-}" == "--uninstall" ]]; then
  uninstall
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "El helper es macOS nomas." >&2
  exit 1
fi

NODE="$(command -v node || true)"
if [[ -z "${NODE}" ]]; then
  echo "No encuentro node en el PATH." >&2
  exit 1
fi
if [[ ! -f "${SRC}" ]]; then
  echo "No está ${SRC}" >&2
  exit 1
fi

mkdir -p "${HOME_MOLPO}/prompts" "${HOME}/Library/LaunchAgents"
cp "${SRC}" "${DEST}"

cat > "${PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml "${NODE}")</string>
    <string>$(xml "${DEST}")</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>$(xml "${HOME}")</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$(xml "${HOME_MOLPO}/resolver.log")</string>
  <key>StandardErrorPath</key>
  <string>$(xml "${HOME_MOLPO}/resolver.log")</string>
</dict>
</plist>
EOF

launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl unload "${PLIST}" 2>/dev/null || true
if ! launchctl bootstrap "${DOMAIN}" "${PLIST}" 2>/dev/null; then
  launchctl load -w "${PLIST}"
fi
launchctl enable "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl kickstart -k "${DOMAIN}/${LABEL}" 2>/dev/null || true

ok=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf -H "origin: http://app.localhost:3000" "http://127.0.0.1:47821/salud" >/dev/null; then
    ok=1
    break
  fi
  sleep 0.3
done
if [[ "${ok}" -ne 1 ]]; then
  echo "El LaunchAgent está cargado pero no responde en :47821. Mirá ${HOME_MOLPO}/resolver.log" >&2
  exit 1
fi

echo "Helper en http://127.0.0.1:47821"
echo "Mapa: ${HOME_MOLPO}/proyectos.json"
echo "Si actualizás el repo, corré pnpm resolver:install de nuevo."
