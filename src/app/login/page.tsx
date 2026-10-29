import { Brand } from "../../components/brand";
import { AuthForm } from "../../components/auth-form";
import { DemoButtons } from "../../components/demo-buttons";
export default function Login() {
  return (
    <main className="auth-page">
      <Brand />
      <div className="auth-box">
        <h1>Снова дома</h1>
        <p>Войдите, чтобы пользоваться сервисами общежития.</p>
        <AuthForm />
        <div className="auth-demo">
          <h2>Здесь впервые?</h2>
          <p>Попробуйте демоверсию без регистрации.</p>
          <DemoButtons compact />
        </div>
      </div>
      <a className="text-link" href="/">
        ← На главную
      </a>
    </main>
  );
}
