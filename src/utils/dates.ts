export function todayIso(timeZone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function parseIso(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function daysUntil(endDate: string, today: string): number {
  const ms = parseIso(endDate).getTime() - parseIso(today).getTime();
  return Math.round(ms / 86400000);
}

export type ExpiryBucket = "EXPIRED" | "TODAY" | "D7" | "D30" | "LATER";

export function expiryBucket(endDate: string, today: string): ExpiryBucket {
  const days = daysUntil(endDate, today);
  if (days < 0) return "EXPIRED";
  if (days === 0) return "TODAY";
  if (days <= 7) return "D7";
  if (days <= 30) return "D30";
  return "LATER";
}

export function deriveMemberStatus(
  current: string,
  endDate: string,
  today: string,
): "ACTIVE" | "EXPIRED" | "SUSPENDED" | "INACTIVE" {
  if (current === "SUSPENDED" || current === "INACTIVE") {
    return current;
  }
  return daysUntil(endDate, today) < 0 ? "EXPIRED" : "ACTIVE";
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function inRange(isoDate: string, from?: string, to?: string): boolean {
  if (from && isoDate < from) return false;
  if (to && isoDate > to) return false;
  return true;
}
