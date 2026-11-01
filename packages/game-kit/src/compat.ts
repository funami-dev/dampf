/**
 * Nachrüstungen für ältere Browser (BUILD-AK-12). `.at()` gibt es in Safari erst ab 15.4;
 * Spiele und Three.js nutzen es.
 */
function at<T>(this: ArrayLike<T>, index: number): T | undefined {
  const n = Math.trunc(index) || 0;
  const i = n < 0 ? this.length + n : n;
  return i < 0 || i >= this.length ? undefined : this[i];
}

/** Rüstet `.at()` auf den übergebenen Prototypen nach, wo es fehlt. */
export function installAt(protos: object[]): void {
  for (const proto of protos) {
    if (typeof (proto as { at?: unknown }).at === "function") continue;
    Object.defineProperty(proto, "at", { value: at, writable: true, configurable: true });
  }
}

const typedArrayProto = Object.getPrototypeOf(Int8Array.prototype) as object;
installAt([Array.prototype, String.prototype, typedArrayProto]);
