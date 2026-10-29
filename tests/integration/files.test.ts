import { beforeAll, afterAll, test, expect } from "vitest";
import sharp from "sharp";
import { db } from "../../src/lib/db";
import { createDemoWorkspace } from "../../src/lib/demo";
import { saveAttachment, readAttachment } from "../../src/lib/storage";
import { createComplaint } from "../../src/features/requests/service";
if (!process.env.DATABASE_URL?.includes("/dormitory_test"))
  throw new Error("Dedicated test DB required");
let demo: Awaited<ReturnType<typeof createDemoWorkspace>>;
beforeAll(async () => {
  demo = await createDemoWorkspace();
});
afterAll(async () => {
  if (demo) await db.workspace.delete({ where: { id: demo.workspaceId } });
  await db.$disconnect();
});
test("only real bounded photos accepted", async () => {
  await expect(
    saveAttachment(
      demo.resident.id,
      new File(["<svg></svg>"], "x.svg", { type: "image/svg+xml" }),
    ),
  ).rejects.toThrow();
  await expect(
    saveAttachment(
      demo.resident.id,
      new File(["fake"], "x.png", { type: "image/png" }),
    ),
  ).rejects.toThrow();
  await expect(
    saveAttachment(
      demo.resident.id,
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "x.png", {
        type: "image/png",
      }),
    ),
  ).rejects.toThrow();
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#236452" },
  })
    .png()
    .toBuffer();
  const f = await saveAttachment(
    demo.resident.id,
    new File([new Uint8Array(png)], "photo.png", { type: "image/png" }),
  );
  const c = await createComplaint(demo.resident.id, {
    title: "Тест с фотографией",
    description: "Проверяем приватность вложенной фотографии",
    attachmentIds: [f.id],
  });
  expect(c.id).toBeTruthy();
  expect((await readAttachment(demo.resident.id, f.id)).mime).toBe(
    "image/webp",
  );
  await expect(readAttachment(demo.master.id, f.id)).rejects.toThrow();
  expect(
    (await readAttachment(demo.admin.id, f.id)).buffer.length,
  ).toBeGreaterThan(0);
});
