import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { loginUser, registerUser } from "../../../../lib/accounts";
import { createDemoWorkspace } from "../../../../lib/demo";
import {
  createSession,
  cookieOptions,
  getSessionUser,
  SESSION_COOKIE,
} from "../../../../lib/auth";
import { checkOrigin, errorResponse, limited } from "../../../../lib/http";
import { AppError, digest } from "../../../../lib/security";
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  try {
    checkOrigin(req);
    const { action } = await context.params;
    if (action === "logout") {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      if (token) await db.session.deleteMany({ where: { id: digest(token) } });
      const res = NextResponse.json({ ok: true });
      res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
      return res;
    }
    const data = await req.json();
    let user;
    if (action === "demo") {
      if (process.env.DEMO_ENABLED === "false")
        throw new AppError("Демонстрация выключена", 403);
      const { role } = z
        .object({ role: z.enum(["RESIDENT", "MASTER", "ADMIN"]) })
        .parse(data);
      const current = await getSessionUser();
      if (current?.isDemo) {
        user = await db.user.findFirst({
          where: { workspaceId: current.workspaceId, role, isDemo: true },
        });
      }
      if (!user) {
        await limited("demo:global", 60, 60);
        const demo = await createDemoWorkspace();
        user =
          role === "ADMIN"
            ? demo.admin
            : role === "MASTER"
              ? demo.master
              : demo.resident;
      }
    } else if (action === "register") {
      await limited("register:global", 40, 60);
      user = await registerUser(data);
    } else if (action === "login") {
      const input = z
        .object({
          email: z.email().max(200),
          password: z.string().min(1).max(128),
        })
        .parse(data);
      await limited(`login:${input.email.toLowerCase()}`, 10);
      user = await loginUser(input.email, input.password);
    } else throw new AppError("Не найдено", 404);
    const token = await createSession(user.id);
    const res = NextResponse.json({
      ok: true,
      pending: user.status === "PENDING",
    });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
