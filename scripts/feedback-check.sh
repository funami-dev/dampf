#!/usr/bin/env bash
# Meldet beim Start einer Claude-Session, ob es neues Feedback gibt (Spec 004, SessionStart-Hook).
# Blockiert die Session nie: immer Exit-Code 0, höchstens etwa 5 Sekunden.
# Gibt nur Zahlen und Spielnamen aus – nie das Token und nie Feedback-Texte.
# Token: in der Claude-Umgebung setzt der Proxy den Header ein; lokal optional aus
# FEEDBACK_ADMIN_TOKEN (wird über stdin an curl gegeben, nicht über die Kommandozeile).
set -u
API="${FEEDBACK_API:-https://dampf.dw-a6b.workers.dev/feedback}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "Feedback-Check: Feedback konnte nicht abgefragt werden ($1)."
  exit 0
}

command -v curl >/dev/null 2>&1 || fail "curl fehlt"
command -v node >/dev/null 2>&1 || fail "node fehlt"

args=(-sS -o - -w '\n%{http_code}' --max-time 5 --connect-timeout 4)
if [ -n "${FEEDBACK_ADMIN_TOKEN:-}" ]; then
  out=$(printf 'header = "Authorization: Bearer %s"\n' "$FEEDBACK_ADMIN_TOKEN" |
    curl "${args[@]}" -K - "$API/stats" 2>/dev/null) || fail "Server nicht erreichbar"
else
  out=$(curl "${args[@]}" "$API/stats" 2>/dev/null) || fail "Server nicht erreichbar"
fi

code="${out##*$'\n'}"
body="${out%$'\n'*}"
case "$code" in
  200) ;;
  401 | 403) fail "kein gültiges Token" ;;
  *) fail "Antwort $code" ;;
esac

FORMAT='
const fs = require("node:fs");
const root = process.argv[1];
const s = JSON.parse(fs.readFileSync(0, "utf8"));
const total = s?.neu?.gesamt;
const per = s?.neu?.jeSpiel ?? {};
if (!Number.isInteger(total) || total < 0 || typeof per !== "object") process.exit(2);
if (total === 0) {
  console.log("Feedback-Check: Kein neues Feedback.");
  process.exit(0);
}
const title = (slug) => {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return null;
  if (slug === "portal") return "Startseite";
  try {
    return JSON.parse(fs.readFileSync(`${root}/games/${slug}/game.json`, "utf8")).title || slug;
  } catch {
    return slug;
  }
};
const parts = Object.entries(per)
  .filter(([slug, n]) => Number.isInteger(n) && n > 0 && title(slug))
  .sort((a, b) => b[1] - a[1] || title(a[0]).localeCompare(title(b[0]), "de"))
  .map(([slug, n]) => `${n}× ${title(slug)}`);
const word = total === 1 ? "neues Feedback" : "neue Feedbacks";
const verb = total === 1 ? "Es gibt 1" : `Es gibt ${total}`;
console.log(`Feedback-Check: ${verb} ${word}: ${parts.join(", ")} – ansehen?`);
'
node -e "$FORMAT" "$ROOT" <<<"$body" 2>/dev/null || fail "unerwartete Antwort"
exit 0
