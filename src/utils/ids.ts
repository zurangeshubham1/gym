export function nextSequentialId(prefix: string, existingIds: string[], width = 3): string {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of existingIds) {
    const match = id.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}
