import { test, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/security";
test("malformed hashes fail closed", async () => {
  expect(await verifyPassword("test", "invalid")).toBe(false);
  expect(await verifyPassword("test", "a:ff")).toBe(false);
});
