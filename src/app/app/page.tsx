import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import { refreshDashboard } from "../../lib/dashboard";
import { Dashboard } from "../../components/dashboard";
export const dynamic = "force-dynamic";
export default async function App() {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (u.status === "PENDING") redirect("/pending");
  return (
    <Dashboard
      initial={JSON.parse(JSON.stringify(await refreshDashboard(u.id)))}
    />
  );
}
