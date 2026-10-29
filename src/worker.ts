import { runScheduledJobs } from "./features/notifications/service";
import { db } from "./lib/db";
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function main() {
  console.log("Соседи: worker запущен");
  while (!stopping) {
    try {
      await runScheduledJobs();
    } catch (e) {
      console.error("Ошибка фоновой задачи", e);
    }
    for (let i = 0; i < 30 && !stopping; i++)
      await new Promise((r) => setTimeout(r, 1000));
  }
  await db.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
