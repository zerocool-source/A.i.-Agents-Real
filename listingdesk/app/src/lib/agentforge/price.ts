// Parses what an agent actually types for a price: "685000", "$685,000",
// "685k", and "1.2m" all land on the number she meant. Returns 0 when the
// input doesn't contain a usable price.
export function parsePrice(raw: string): number {
  const s = raw.trim().toLowerCase();
  const n = Number(s.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (/m\s*$/.test(s)) return Math.round(n * 1_000_000);
  if (/k\s*$/.test(s)) return Math.round(n * 1_000);
  return Math.round(n);
}
