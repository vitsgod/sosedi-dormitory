"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="auth-page">
      <div className="auth-box">
        <h1>Не удалось загрузить страницу</h1>
        <p>
          Проверьте подключение и попробуйте ещё раз. Если вы запускаете проект
          локально, убедитесь, что PostgreSQL работает.
        </p>
        <button className="button primary" onClick={reset}>
          Повторить
        </button>
        <a className="text-link" href="/">
          На главную
        </a>
      </div>
    </main>
  );
}
