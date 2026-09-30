"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      window.localStorage.setItem("planner.theme.v1", nextTheme);
    } catch {
      return;
    }
  };

  return (
    <button className={`theme-toggle ${showLabel ? "is-row" : ""}`} type="button" onClick={toggleTheme} role={showLabel ? "switch" : undefined} aria-checked={showLabel ? theme === "dark" : undefined} aria-label={showLabel ? "Тёмная тема" : theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"} title={showLabel ? undefined : theme === "dark" ? "Светлая тема" : "Тёмная тема"}>
      <span className="theme-toggle-glyph">
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 13.1A8.5 8.5 0 0 1 10.9 3.5 8.5 8.5 0 1 0 20.5 13.1Z" /></svg>
      )}
      </span>
      {showLabel ? <><span className="theme-toggle-copy"><strong>Тёмная тема</strong><small>{theme === "dark" ? "Включена" : "Выключена"}</small></span><span className={`theme-toggle-track ${theme === "dark" ? "is-on" : ""}`} aria-hidden="true"><span /></span></> : null}
    </button>
  );
}
