import type { AttendeeOverrides } from "@/db/schema";

export type EaterLike = {
  id: string;
  isDefaultEater: boolean;
  archivedAt: Date | string | null;
};

/**
 * Who eats at a slot: household default eaters, minus anyone marked away that day,
 * plus/minus explicit slot overrides. Derived at read time so nothing goes stale.
 */
export function resolveAttendees(input: {
  people: EaterLike[];
  awayPersonIds: Iterable<string>;
  overrides: AttendeeOverrides | null | undefined;
}): string[] {
  const away = new Set(input.awayPersonIds);
  const remove = new Set(input.overrides?.remove ?? []);
  const add = input.overrides?.add ?? [];
  const active = input.people.filter((p) => !p.archivedAt);
  const ids = new Set<string>();
  for (const p of active) {
    if (p.isDefaultEater && !away.has(p.id) && !remove.has(p.id)) ids.add(p.id);
  }
  for (const id of add) {
    if (active.some((p) => p.id === id) && !remove.has(id)) ids.add(id);
  }
  return active.filter((p) => ids.has(p.id)).map((p) => p.id);
}

/** Default portions for a card dropped on a slot. Never below 1. */
export function defaultPortions(
  attendeeCount: number,
  guestCount: number,
): number {
  return Math.max(1, attendeeCount + Math.max(0, guestCount));
}
