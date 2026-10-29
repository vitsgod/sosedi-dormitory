import { expect, test } from "vitest";
import { validateBooking } from "../../src/features/laundry/rules";
const now = new Date("2026-11-03T04:00:00Z");
test("Tuesday 08:00 Moscow is allowed", () =>
  expect(() =>
    validateBooking(new Date("2026-11-03T05:00:00Z"), 60, now),
  ).not.toThrow());
test.each([
  ["2026-11-02T06:00:00Z", 60, new Date("2026-11-01T08:00:00Z")],
  ["2026-11-03T03:30:00Z", 60, new Date("2026-11-03T02:00:00Z")],
  ["2026-11-08T20:30:00Z", 60, new Date("2026-11-08T19:00:00Z")],
  ["2026-11-04T05:00:00Z", 60, now],
  ["2026-11-03T05:00:00Z", 17, now],
  ["2026-11-03T05:00:00Z", 181, now],
  ["2026-11-03T03:00:00Z", 60, now],
])("invalid booking %s / %i is rejected", (s, d, n) =>
  expect(() => validateBooking(new Date(s), d, n)).toThrow(),
);
