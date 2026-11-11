/**
 * Phaser verarbeitet manchmal dieselbe Taste zweimal: Wird seine Ereignis-Warteschlange zwischen
 * zwei Bildern nicht geleert, kommt ein schon behandeltes `keydown` noch einmal an (MANIFEST-AK-10).
 * `fresh` lässt jedes Browser-Ereignis nur einmal durch.
 */
export function fresh(fn: (e: KeyboardEvent) => void): (e: KeyboardEvent) => void {
  const seen = new WeakSet<KeyboardEvent>();
  return (e) => {
    if (seen.has(e)) return;
    seen.add(e);
    fn(e);
  };
}
