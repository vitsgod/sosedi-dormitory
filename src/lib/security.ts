import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function assertAccess(
  user: { role: string; status: string } | null,
  roles: string[],
) {
  if (!user) throw new AppError("Войдите в аккаунт", 401);
  if (user.status !== "APPROVED")
    throw new AppError("Дождитесь подтверждения администратора", 403);
  if (!roles.includes(user.role)) throw new AppError("Недостаточно прав", 403);
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
