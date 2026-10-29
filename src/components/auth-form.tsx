"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
export function AuthForm({ register = false }: { register?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      window.location.href = body.pending ? "/pending" : "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
      setBusy(false);
    }
  }
  return (
    <form className="stack-form" onSubmit={submit}>
      {register && (
        <>
          <label>
            Ваше имя
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="Как к вам обращаться"
            />
          </label>
          <label>
            Комната
            <input
              name="room"
              required
              maxLength={12}
              placeholder="Например, 412"
            />
          </label>
        </>
      )}
      <label>
        Электронная почта
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.ru"
        />
      </label>
      <label>
        Пароль
        <input
          name="password"
          type="password"
          required
          minLength={register ? 10 : 1}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
          aria-describedby={register ? "password-hint" : undefined}
        />
        {register && <small id="password-hint">Не менее 10 символов.</small>}
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="button primary">
        {busy ? <LoaderCircle className="spin" size={18} /> : null}
        {register ? "Отправить заявку" : "Войти"}
        <ArrowRight size={17} />
      </button>
      <p className="form-note">
        {register ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
        <Link href={register ? "/login" : "/register"}>
          {register ? "Войти" : "Подать заявку"}
        </Link>
      </p>
    </form>
  );
}
