"use client";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
export function DemoButtons({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function enter(role: string) {
    setBusy(role);
    setError("");
    try {
      const r = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      window.location.href = "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
      setBusy("");
    }
  }
  return (
    <div className={compact ? "demo-compact" : "demo-actions"}>
      {(["RESIDENT", "MASTER", "ADMIN"] as const).map((role, i) => (
        <button
          key={role}
          className={
            i === 0 && !compact ? "button primary" : "button secondary"
          }
          disabled={!!busy}
          onClick={() => enter(role)}
        >
          {busy === role ? <LoaderCircle size={17} className="spin" /> : null}
          {["Я жилец", "Я мастер", "Я администратор"][i]}
          <ArrowUpRight size={17} />
        </button>
      ))}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
