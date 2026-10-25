/**
 * Plan-date arithmetic on 'YYYY-MM-DD' strings.
 * Invariant 1: plan dates are DATE columns and IsoDate strings; never a JS Date for plan logic.
 * All maths runs on UTC-midnight instants so DST changes (BST) cannot shift a day.
 */

export type IsoDate = string & { readonly __brand: "IsoDate" };

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validate and brand a 'YYYY-MM-DD' string. Throws on malformed or impossible dates. */
export function isoDate(value: string): IsoDate {
  const m = ISO_RE.exec(value);
  if (!m) throw new Error(`Invalid IsoDate: ${value}`);
  const [, y, mo, d] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  const check = new Date(t);
  if (
    check.getUTCFullYear() !== Number(y) ||
    check.getUTCMonth() !== Number(mo) - 1 ||
    check.getUTCDate() !== Number(d)
  ) {
    throw new Error(`Impossible calendar date: ${value}`);
  }
  return value as IsoDate;
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  try {
    isoDate(value);
    return true;
  } catch {
    return false;
  }
}

function toUtcMs(d: IsoDate): number {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, day);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10) as IsoDate;
}

/** Today's calendar date in a given IANA timezone (defaults to Europe/London). */
export function todayIn(
  timeZone = "Europe/London",
  now: Date = new Date(),
): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return isoDate(parts);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtcMs(toUtcMs(d) + n * 86_400_000);
}

/** Whole days from a to b (positive when b is after a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday (ISO weekday, zero-based). */
export function weekdayIndex(d: IsoDate): number {
  return (new Date(toUtcMs(d)).getUTCDay() + 6) % 7;
}

/** The first day of the week containing d. weekStartsOn: 0 = Monday … 6 = Sunday. */
export function weekStartFor(d: IsoDate, weekStartsOn = 0): IsoDate {
  const offset = (weekdayIndex(d) - weekStartsOn + 7) % 7;
  return addDays(d, -offset);
}

export function weekDays(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

/** Human label for a plan date, computed in UTC so the day never shifts. */
export function formatDay(
  d: IsoDate,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
  locale = "en-GB",
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(toUtcMs(d)));
}

export const WEEKDAY_SHORT = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
