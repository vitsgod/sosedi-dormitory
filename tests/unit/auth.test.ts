import { expect, test } from "vitest";
import {
  hashPassword,
  verifyPassword,
  assertAccess,
} from "../../src/lib/security";
test("password hashes are salted and only accept correct passwords", async () => {
  const hash = await hashPassword("correct-horse-123");
  expect(hash).not.toContain("correct-horse");
  expect(await verifyPassword("correct-horse-123", hash)).toBe(true);
  expect(await verifyPassword("wrong", hash)).toBe(false);
  expect(await hashPassword("correct-horse-123")).not.toBe(hash);
});
test("access rejects anonymous, pending and wrong roles", () => {
  expect(() => assertAccess(null, ["ADMIN"])).toThrow("Войдите");
  expect(() =>
    assertAccess({ role: "RESIDENT", status: "PENDING" }, ["RESIDENT"]),
  ).toThrow("подтверждения");
  expect(() =>
    assertAccess({ role: "RESIDENT", status: "APPROVED" }, ["ADMIN"]),
  ).toThrow("Недостаточно");
  expect(() =>
    assertAccess({ role: "ADMIN", status: "APPROVED" }, ["ADMIN"]),
  ).not.toThrow();
});
