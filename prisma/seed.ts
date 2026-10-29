import "dotenv/config";
import { db } from "../src/lib/db";
import { seedWorkspace } from "../src/lib/demo";
import { hashPassword } from "../src/lib/security";
async function main() {
  const existing = await db.workspace.findUnique({ where: { id: "public" } });
  if (!existing) {
    await db.workspace.create({ data: { id: "public", demo: false } });
    await seedWorkspace("public", true);
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await db.user.upsert({
      where: {
        workspaceId_email: {
          workspaceId: "public",
          email: process.env.ADMIN_EMAIL,
        },
      },
      create: {
        workspaceId: "public",
        email: process.env.ADMIN_EMAIL,
        name: "Администратор",
        room: "",
        role: "ADMIN",
        status: "APPROVED",
        isDemo: false,
        passwordHash: await hashPassword(process.env.ADMIN_PASSWORD),
      },
      update: {},
    });
  }
  console.log(
    "Данные подготовлены. Демоаккаунты создаются отдельно для каждого посетителя.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
