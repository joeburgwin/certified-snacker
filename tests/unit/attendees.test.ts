import { describe, expect, it } from "vitest";
import { defaultPortions, resolveAttendees } from "@/domain/attendees";

const people = [
  { id: "joe", isDefaultEater: true, archivedAt: null },
  { id: "partner", isDefaultEater: true, archivedAt: null },
  { id: "kid", isDefaultEater: false, archivedAt: null },
  { id: "old", isDefaultEater: true, archivedAt: new Date() },
];

describe("resolveAttendees", () => {
  it("defaults to active default eaters", () => {
    expect(
      resolveAttendees({ people, awayPersonIds: [], overrides: null }),
    ).toEqual(["joe", "partner"]);
  });
  it("removes anyone away that day", () => {
    expect(
      resolveAttendees({ people, awayPersonIds: ["partner"], overrides: null }),
    ).toEqual(["joe"]);
  });
  it("applies slot overrides on top", () => {
    expect(
      resolveAttendees({
        people,
        awayPersonIds: [],
        overrides: { add: ["kid"], remove: ["joe"] },
      }),
    ).toEqual(["partner", "kid"]);
    expect(
      resolveAttendees({
        people,
        awayPersonIds: [],
        overrides: { add: ["old", "ghost"] },
      }),
    ).toEqual(["joe", "partner"]);
  });
  it("never drops below one portion", () => {
    expect(defaultPortions(2, 1)).toBe(3);
    expect(defaultPortions(0, 0)).toBe(1);
  });
});
