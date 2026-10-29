import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import { Brand } from "../../components/brand";
import { Clock3 } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Pending() {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (u.status === "APPROVED") redirect("/app");
  return (
    <main className="auth-page">
      <Brand />
      <div className="auth-box pending-box">
        <Clock3 size={44} />
        <h1>Заявка отправлена</h1>
        <p>
          {u.name}, администратор проверит данные комнаты {u.room}. После
          подтверждения здесь откроется личный кабинет.
        </p>
        <a className="button primary" href="/app">
          Проверить статус
        </a>
        <a className="text-link" href="/">
          На главную
        </a>
      </div>
    </main>
  );
}
