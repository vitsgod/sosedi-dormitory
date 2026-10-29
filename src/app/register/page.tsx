import { Brand } from "../../components/brand";
import { AuthForm } from "../../components/auth-form";
export default function Register() {
  return (
    <main id="main-content" tabIndex={-1} className="auth-page">
      <Brand />
      <div className="auth-box">
        <h1>Давайте знакомиться</h1>
        <p>
          Подайте заявку. Администратор проверит проживание и откроет доступ к
          сервисам.
        </p>
        <AuthForm register />
      </div>
      <a className="text-link" href="/">
        ← На главную
      </a>
    </main>
  );
}
