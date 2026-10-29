import { z } from "zod";
import { db } from "./db";
import {
  AppError,
  assertAccess,
  hashPassword,
  verifyPassword,
} from "./security";
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().toLowerCase().max(200),
  room: z.string().trim().min(1).max(12),
  password: z.string().min(10).max(128),
});
export const specialties = ["PLUMBER", "ELECTRICIAN", "LOCKSMITH"] as const;
export async function registerUser(input: unknown, workspaceId = "public") {
  const data = registrationSchema.parse(input);
  if (
    await db.user.findUnique({
      where: { workspaceId_email: { workspaceId, email: data.email } },
    })
  )
    throw new AppError("Этот адрес уже зарегистрирован", 409);
  const { password, ...profile } = data;
  return db.user.create({
    data: {
      ...profile,
      passwordHash: await hashPassword(password),
      workspaceId,
    },
  });
}
export async function loginUser(
  email: string,
  password: string,
  workspaceId = "public",
) {
  const user = await db.user.findUnique({
    where: {
      workspaceId_email: { workspaceId, email: email.toLowerCase().trim() },
    },
  });
  if (
    !user ||
    user.isDemo ||
    !(await verifyPassword(password, user.passwordHash))
  )
    throw new AppError(
      "Неверная почта или пароль. Для демонстрации используйте быстрый вход.",
      401,
    );
  if (user.status === "REJECTED" || user.status === "DISABLED")
    throw new AppError("Доступ к аккаунту закрыт", 403);
  return user;
}
export async function getActor(id: string, roles: string[]) {
  const u = await db.user.findUnique({ where: { id } });
  assertAccess(u, roles);
  return u!;
}
export async function approveUser(
  adminId: string,
  userId: string,
  status: string,
) {
  const admin = await getActor(adminId, ["ADMIN"]);
  const target = await db.user.findFirst({
    where: { id: userId, workspaceId: admin.workspaceId },
  });
  if (!target) throw new AppError("Профиль не найден", 404);
  if (target.isDemo)
    throw new AppError("Доступ демонстрационного профиля защищён", 403);
  if (!["APPROVED", "REJECTED", "DISABLED"].includes(status))
    throw new AppError("Неверный статус");
  if (target.id === adminId) throw new AppError("Нельзя заблокировать себя");
  return db.user.update({ where: { id: userId }, data: { status } });
}
export async function changeRole(
  adminId: string,
  userId: string,
  role: string,
  specialty: string | null,
) {
  const admin = await getActor(adminId, ["ADMIN"]);
  const target = await db.user.findFirst({
    where: { id: userId, workspaceId: admin.workspaceId },
  });
  if (!target) throw new AppError("Профиль не найден", 404);
  if (target.isDemo)
    throw new AppError("Роль демонстрационного профиля защищена", 403);
  if (target.id === adminId)
    throw new AppError("Нельзя изменить собственную роль");
  if (
    !["RESIDENT", "MASTER", "ADMIN"].includes(role) ||
    (role === "MASTER" && !specialties.includes(specialty as never))
  )
    throw new AppError("Выберите роль и специальность");
  return db.user.update({
    where: { id: userId },
    data: { role, specialty: role === "MASTER" ? specialty : null },
  });
}
