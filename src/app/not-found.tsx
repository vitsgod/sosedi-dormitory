import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-box">
        <h1>Здесь пока пусто</h1>
        <p>Такой страницы нет. Вернёмся домой?</p>
        <Link className="button primary" href="/">
          На главную
        </Link>
      </div>
    </main>
  );
}
