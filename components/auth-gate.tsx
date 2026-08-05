"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthGateProps = {
  children: (user: User) => React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) {
    return <SetupScreen />;
  }

  if (user === undefined) {
    return <main className="auth-shell"><p className="auth-status">Подключаем защищённое пространство…</p></main>;
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
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const supabase = createClient();
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(isSignUp && !result.data.session ? "Проверь почту и подтверди аккаунт, затем войди." : "Готово.");
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <span className="section-kicker">Личный ежедневник</span>
        <h1>{isSignUp ? "Создать аккаунт" : "Войти"}</h1>
        <p>Твои цели и дела будут доступны только после входа.</p>
        <label className="field-label">E-mail<input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field-label">Пароль<input className="input" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message ? <p className="auth-message">{message}</p> : null}
        <button className="button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Подожди…" : isSignUp ? "Создать аккаунт" : "Войти"}</button>
        <button className="auth-switch" type="button" onClick={() => { setIsSignUp((current) => !current); setMessage(null); }}>
          {isSignUp ? "У меня уже есть аккаунт" : "Создать новый аккаунт"}
        </button>
      </form>
    </main>
  );
}
