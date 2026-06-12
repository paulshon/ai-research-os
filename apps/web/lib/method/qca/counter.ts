/**
 * counter.ts — small Counter helper matching Python collections.Counter semantics.
 * Insertion order is preserved (first-seen key order), and most_common is a
 * stable sort by count descending — identical tie-breaking to CPython 3.7+.
 */
export class Counter<K = string> {
  private map = new Map<K, number>();

  add(key: K, by = 1): void {
    this.map.set(key, (this.map.get(key) ?? 0) + by);
  }

  update(keys: Iterable<K>): void {
    for (const k of keys) this.add(k, 1);
  }

  get(key: K): number {
    return this.map.get(key) ?? 0;
  }

  get size(): number {
    return this.map.size;
  }

  entries(): Array<[K, number]> {
    return Array.from(this.map.entries());
  }

  /** Stable sort by count desc; ties keep first-insertion order (like CPython). */
  mostCommon(n?: number): Array<[K, number]> {
    const arr = Array.from(this.map.entries());
    // Array.prototype.sort is stable (ES2019), so equal counts keep order.
    arr.sort((a, b) => b[1] - a[1]);
    return n === undefined ? arr : arr.slice(0, n);
  }
}
