import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, digest } from "./security";
import { db } from "./db";
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (!origin || origin !== expected)
    throw new AppError("Недопустимый источник запроса", 403);
}
export function errorResponse(e: unknown) {
  if (e instanceof AppError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError) {
    const names: Record<string, string> = {
      name: "имя",
      email: "электронная почта",
      password: "пароль",
      room: "комната",
      title: "тема",
      description: "описание",
      body: "текст",
      startsAt: "начало",
      endsAt: "окончание",
      durationMinutes: "длительность",
      specialty: "специальность",
      attachmentIds: "фотографии",
    };
    return NextResponse.json(
      {
        error: `Проверьте заполнение полей: ${[...new Set(e.issues.map((i) => names[String(i.path[0])] || "данные формы"))].join(", ")}.`,
      },
      { status: 400 },
    );
  }
  console.error(e);
  return NextResponse.json(
    { error: "Не удалось выполнить запрос. Попробуйте ещё раз." },
    { status: 500 },
  );
}
export async function limited(key: string, max: number, windowMinutes = 15) {
  const now = new Date();
  const id = digest(key);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO "RateLimit" (key, attempts, "expiresAt") VALUES (${id}, 1, ${new Date(now.getTime() + windowMinutes * 60000)}) ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit".attempts + 1 END, "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${new Date(now.getTime() + windowMinutes * 60000)} ELSE "RateLimit"."expiresAt" END`;
    const r = await tx.rateLimit.findUniqueOrThrow({ where: { key: id } });
    if (r.attempts > max)
      throw new AppError("Слишком много попыток. Попробуйте позднее.", 429);
  });
}
