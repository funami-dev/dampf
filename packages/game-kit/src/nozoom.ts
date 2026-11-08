/**
 * Kein Zoom auf Spielseiten (MANIFEST-AK-09): Safari auf iPhone/iPad vergrößert sonst bei schnellem
 * Doppeltippen oder mit zwei Fingern – mitten im Spiel kommt man da schwer wieder heraus.
 */
export const DOUBLE_TAP_MS = 350;

const EDITABLE = "input, textarea, select, [contenteditable]";
const CLICKABLE = "button, a, label, summary, [role=button], [role=link]";

export function installNoZoom(doc: Document = document): void {
  // Zweiter Tipp eines Doppeltipps: Browser-Zoom verhindern, den Klick aber selbst auslösen,
  // damit das Spiel beide Tipps bekommt (z. B. zweimal „Holz hacken“).
  let lastEnd = -Infinity;
  doc.addEventListener(
    "touchend",
    (e) => {
      const now = e.timeStamp;
      const target = e.target as Element | null;
      const quick = now - lastEnd < DOUBLE_TAP_MS;
      lastEnd = now;
      if (!quick || !e.cancelable || e.touches.length > 0) return;
      if (target?.closest?.(EDITABLE)) return;
      e.preventDefault();
      const el = target?.closest?.(CLICKABLE) as HTMLElement | null;
      if (el && !(el as HTMLButtonElement).disabled) el.click();
    },
    { passive: false },
  );

  // Zwei-Finger-Zoom (Safari-Gesten)
  for (const type of ["gesturestart", "gesturechange", "gestureend"])
    doc.addEventListener(type, (e) => e.preventDefault(), { passive: false });

  // Notausgang: schon vergrößert (z. B. durch Bedienungshilfen) → beim nächsten Tippen auf 100 %
  const vv = doc.defaultView?.visualViewport;
  doc.addEventListener(
    "touchstart",
    () => {
      if (!vv || vv.scale <= 1.01) return;
      const meta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (!meta) return;
      const original = meta.content;
      meta.content = `${original.replace(/,?\s*maximum-scale=[^,]*/g, "")}, maximum-scale=1`;
      setTimeout(() => (meta.content = original), 400);
    },
    { passive: true },
  );
}
