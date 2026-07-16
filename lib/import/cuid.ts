/** Minimal cuid-like unique ID generator for import batch IDs. */
export function cuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `c${timestamp}${random}`;
}
