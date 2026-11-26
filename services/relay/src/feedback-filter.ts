/**
 * Verdachtsfilter für Feedback-Texte (Spec 004, „Verdachtsfilter“, FEEDBACK-AK-32).
 * Einfache Regeln gegen Links, Code und Anweisungen an eine KI (Prompt-Injection).
 * Lieber ein harmloser Text zu viel im Verdacht als ein Angriff in der normalen Liste.
 */

export type SuspicionRule = "link" | "code" | "anweisung" | "zeichen";

const LINK = [/\bhttps?:\/\//i, /\bwww\./i, /\b[a-z0-9-]{2,}\.[a-z]{2,6}\//i];

const CODE = [/```/, /<\s*script/i, /<\?/, /\{\{/, /\$\{/, /^\s*(\$ |#!|sudo\b)/im];

const ANWEISUNG = [
  /\bignorier\w*\s+(\w+\s+){0,3}(anweisung|befehl|regel|vorgabe|instruktion)/i,
  /\bignore\s+(\w+\s+){0,3}(previous|prior|above|instructions?|rules?)/i,
  /\bdu\s+bist\s+(jetzt|ab\s+jetzt|nun)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bsystem\s*-?\s*prompt/i,
  /\bals\s+(eine\s+)?KI\b/i,
  /\bas\s+an\s+AI\b/i,
  /\bneue\s+anweisung/i,
  /\bnew\s+instructions?\b/i,
  /\bführe\b.{0,40}\b(befehl|code|skript|script|kommando|programm)\w*.{0,20}\baus\b/i,
  /\brun\s+the\s+command\b/i,
  /\bclaude\s*,/i,
  /\b(assistant|system)\s*:/i,
];

/** Buchstaben, Ziffern, Leerraum, einfache Satzzeichen, Anführungszeichen und Emojis */
const NORMAL =
  // eslint-disable-next-line no-misleading-character-class -- Emoji-Bausteine einzeln erlaubt
  /[\p{L}\p{M}\p{N}\s.,!?\-'"():;„“‚‘«»…–\u{FE0F}\u{20E3}\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]/u;

/** Gibt die erste zutreffende Regel zurück oder `null`, wenn der Text unauffällig ist */
export function suspicion(text: string): SuspicionRule | null {
  if (LINK.some((r) => r.test(text))) return "link";
  if (CODE.some((r) => r.test(text))) return "code";
  if (ANWEISUNG.some((r) => r.test(text))) return "anweisung";
  const chars = [...text];
  const odd = chars.filter((c) => !NORMAL.test(c)).length;
  if (chars.length >= 10 && odd / chars.length > 0.3) return "zeichen";
  if (/\S{41,}/u.test(text)) return "zeichen";
  return null;
}
