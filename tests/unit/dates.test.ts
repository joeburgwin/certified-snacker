import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatDay,
  isIsoDate,
  isoDate,
  todayIn,
  weekDays,
  weekdayIndex,
  weekStartFor,
} from "@/domain/dates";

describe("isoDate", () => {
  it("accepts valid dates and brands them", () => {
    expect(isoDate("2026-10-25")).toBe("2026-10-25");
  });
  it("rejects malformed and impossible dates", () => {
    expect(() => isoDate("2026-13-01")).toThrow();
    expect(() => isoDate("2026-02-30")).toThrow();
    expect(() => isoDate("25/10/2026")).toThrow();
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("nope")).toBe(false);
  });
});

describe("todayIn (Europe/London across BST boundaries)", () => {
  it("is still 28 March just before the clocks go forward", () => {
    expect(todayIn("Europe/London", new Date("2026-03-28T23:30:00Z"))).toBe(
      "2026-03-28",
    );
  });
  it("is 29 March after the clocks go forward", () => {
    expect(todayIn("Europe/London", new Date("2026-03-29T01:30:00Z"))).toBe(
      "2026-03-29",
    );
  });
  it("is already 25 October at 23:30 UTC on the 24th during BST", () => {
    expect(todayIn("Europe/London", new Date("2026-10-24T23:30:00Z"))).toBe(
      "2026-10-25",
    );
  });
  it("is 25 October after the clocks go back", () => {
    expect(todayIn("Europe/London", new Date("2026-10-25T01:30:00Z"))).toBe(
      "2026-10-25",
    );
  });
});

describe("arithmetic", () => {
  it("adds days across DST changes without drift", () => {
    expect(addDays(isoDate("2026-03-28"), 1)).toBe("2026-03-29");
    expect(addDays(isoDate("2026-03-29"), 1)).toBe("2026-03-30");
    expect(addDays(isoDate("2026-10-24"), 1)).toBe("2026-10-25");
    expect(addDays(isoDate("2026-10-25"), 1)).toBe("2026-10-26");
    expect(addDays(isoDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(isoDate("2026-01-01"), -1)).toBe("2025-12-31");
  });
  it("counts whole days between dates", () => {
    expect(daysBetween(isoDate("2026-10-19"), isoDate("2026-10-25"))).toBe(6);
    expect(daysBetween(isoDate("2026-10-25"), isoDate("2026-10-19"))).toBe(-6);
    expect(daysBetween(isoDate("2026-03-23"), isoDate("2026-03-30"))).toBe(7);
  });
  it("knows weekdays (Mon = 0)", () => {
    expect(weekdayIndex(isoDate("2026-10-19"))).toBe(0); // Monday
    expect(weekdayIndex(isoDate("2026-10-25"))).toBe(6); // Sunday
  });
});

describe("weeks", () => {
  it("finds the Monday for any day of the week", () => {
    expect(weekStartFor(isoDate("2026-10-25"))).toBe("2026-10-19");
    expect(weekStartFor(isoDate("2026-10-19"))).toBe("2026-10-19");
    expect(weekStartFor(isoDate("2026-10-21"))).toBe("2026-10-19");
  });
  it("supports a Sunday start", () => {
    expect(weekStartFor(isoDate("2026-10-21"), 6)).toBe("2026-10-18");
  });
  it("lists seven days including the BST weeks", () => {
    const w = weekDays(isoDate("2026-03-23"));
    expect(w).toHaveLength(7);
    expect(w[6]).toBe("2026-03-29");
    const w2 = weekDays(isoDate("2026-10-19"));
    expect(w2[6]).toBe("2026-10-25");
  });
  it("formats a day label without shifting", () => {
    expect(formatDay(isoDate("2026-10-25"))).toBe("Sun 25 Oct");
    expect(formatDay(isoDate("2026-03-29"))).toBe("Sun 29 Mar");
  });
});
