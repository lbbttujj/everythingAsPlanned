"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const isGoogleSignInEnabled = false;

type AuthGateProps = {
  children: (user: User) => React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) {
    return <SetupScreen />;
  }

  if (user === undefined) {
    return <main className="auth-shell"><p className="auth-status">Подключаем защищённое пространство…</p></main>;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordScreen onComplete={() => setIsPasswordRecovery(false)} />;
  }

  if (!user) return <AuthScreen />;
  return <>{children(user)}</>;
}

function SetupScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="section-kicker">Первичная настройка</span>
        <h1>Подключи Supabase</h1>
        <p>Создай <code>.env.local</code> по примеру <code>.env.example</code> и добавь URL проекта и publishable key.</p>
      </section>
    </main>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const supabase = createClient();
    const result = mode === "sign-up"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(mode === "sign-up" && !result.data.session ? "Проверь почту и подтверди аккаунт, затем войди." : "Готово.");
  };

  const requestPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`
    });

    setIsSubmitting(false);
    setMessage(error ? error.message : "Если аккаунт существует, письмо для сброса пароля уже отправлено.");
  };

  const signInWithGoogle = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });

    if (error) {
      setIsSubmitting(false);
      setMessage(error.message);
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={mode === "forgot-password" ? requestPasswordReset : submit}>
        <span className="section-kicker">Личный ежедневник</span>
        <h1>{mode === "sign-up" ? "Создать аккаунт" : mode === "forgot-password" ? "Восстановить пароль" : "Войти"}</h1>
        <p>{mode === "forgot-password" ? "Укажи e-mail — отправим безопасную ссылку для нового пароля." : "Твои цели и дела будут доступны только после входа."}</p>
        {isGoogleSignInEnabled ? (
          <>
            <button className="button google-auth-button" type="button" disabled={isSubmitting} onClick={signInWithGoogle}>
              <span aria-hidden="true">G</span>
              Продолжить с Google
            </button>
            <div className="auth-divider"><span>или через e-mail</span></div>
          </>
        ) : null}
        <label className="field-label">E-mail<input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {mode !== "forgot-password" ? <label className="field-label">Пароль<input className="input" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label> : null}
        {message ? <p className="auth-message">{message}</p> : null}
        <button className="button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Подожди…" : mode === "sign-up" ? "Создать аккаунт" : mode === "forgot-password" ? "Отправить ссылку" : "Войти"}</button>
        {mode === "forgot-password" ? (
          <button className="auth-switch" type="button" onClick={() => { setMode("sign-in"); setMessage(null); }}>Вернуться ко входу</button>
        ) : (
          <div className="auth-links">
            <button className="auth-switch" type="button" onClick={() => { setMode(mode === "sign-up" ? "sign-in" : "sign-up"); setMessage(null); }}>
              {mode === "sign-up" ? "У меня уже есть аккаунт" : "Создать новый аккаунт"}
            </button>
            <button className="auth-switch" type="button" onClick={() => { setMode("forgot-password"); setMessage(null); }}>Забыли пароль?</button>
          </div>
        )}
      </form>
    </main>
  );
}

function ResetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const { error } = await createClient().auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    onComplete();
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <span className="section-kicker">Безопасность аккаунта</span>
        <h1>Новый пароль</h1>
        <p>Придумай новый пароль для ежедневника.</p>
        <label className="field-label">Новый пароль<input className="input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="field-label">Повтори пароль<input className="input" type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        {message ? <p className="auth-message">{message}</p> : null}
        <button className="button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Сохраняем…" : "Сохранить новый пароль"}</button>
      </form>
    </main>
  );
}
