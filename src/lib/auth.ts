import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { digest, AppError, assertAccess } from "./security";
export const SESSION_COOKIE = "sosedi_session";
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: digest(token),
      userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return token;
}
export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: digest(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.expiresAt.getTime() < Date.now() ||
    ["REJECTED", "DISABLED"].includes(session.user.status)
  )
    return null;
  return session.user;
}
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AppError("Войдите в аккаунт", 401);
  return user;
}
export async function requireRole(roles: string[]) {
  const user = await requireUser();
  assertAccess(user, roles);
  return user;
}
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false,
  path: "/",
  maxAge: 7 * 86400,
};
