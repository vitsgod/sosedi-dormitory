"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Sun, Moon, Monitor, Check, Palette } from "lucide-react";
import {
  THEME_KEY,
  normalizeTheme,
  resolveTheme,
  type ThemePreference,
} from "../lib/theme";
const choices = [
  {
    value: "light" as const,
    label: "Светлая",
    description: "Чистый фон и спокойные акценты",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Тёмная",
    description: "Мягкий контраст для вечерних дел",
    icon: Moon,
  },
  {
    value: "system" as const,
    label: "Как на устройстве",
    description: "Автоматически следовать теме системы",
    icon: Monitor,
  },
];
const ThemeContext = createContext<{
  preference: ThemePreference;
  resolved: "light" | "dark";
  saved: boolean;
  setPreference: (p: ThemePreference) => void;
} | null>(null);
function apply(preference: ThemePreference) {
  const theme = resolveTheme(
    preference,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#101722" : "#f3f5f8");
  return theme;
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [saved, setSaved] = useState(true);
  const preferenceRef = useRef<ThemePreference>("system");
  useEffect(() => {
    let current: ThemePreference = "system";
    try {
      current = normalizeTheme(localStorage.getItem(THEME_KEY));
    } catch {
      setSaved(false);
    }
    preferenceRef.current = current;
    setState(current);
    setResolved(apply(current));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => setResolved(apply(preferenceRef.current));
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY || e.key === null) {
        const p = normalizeTheme(e.newValue);
        preferenceRef.current = p;
        setState(p);
        setResolved(apply(p));
      }
    };
    media.addEventListener("change", onSystem);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  function setPreference(p: ThemePreference) {
    preferenceRef.current = p;
    setState(p);
    setResolved(apply(p));
    try {
      localStorage.setItem(THEME_KEY, p);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }
  return (
    <ThemeContext.Provider
      value={{ preference, resolved, saved, setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw Error("ThemeProvider missing");
  return value;
}
export function ThemeOptions({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  return (
    <fieldset
      className={compact ? "theme-options compact-options" : "theme-options"}
    >
      <legend className="sr-only">Цветовая тема</legend>
      {choices.map(({ value, label, description, icon: Icon }) => (
        <label
          key={value}
          className={`theme-choice ${preference === value ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name={compact ? "quick-theme" : "theme"}
            value={value}
            checked={preference === value}
            onChange={() => setPreference(value)}
          />
          {!compact && (
            <span
              className={`theme-preview preview-${value}`}
              aria-hidden="true"
            >
              <span className="preview-sidebar" />
              <span className="preview-content">
                <i />
                <span />
                <span />
              </span>
            </span>
          )}
          <span className="theme-choice-label">
            <Icon size={18} aria-hidden="true" />
            <strong>{label}</strong>
            <span className="choice-check" aria-hidden="true">
              {preference === value ? <Check size={15} /> : null}
            </span>
          </span>
          {!compact && <span className="theme-description">{description}</span>}
        </label>
      ))}
    </fieldset>
  );
}
export function ThemeMenu() {
  return (
    <details className="theme-menu">
      <summary aria-label="Выбрать цветовую тему" title="Выбрать тему">
        <Palette size={19} aria-hidden="true" />
      </summary>
      <div className="theme-popover">
        <p>Оформление</p>
        <ThemeOptions compact />
      </div>
    </details>
  );
}
export function AppearanceSettings() {
  const { resolved, saved } = useTheme();
  return (
    <div className="settings-layout">
      <section className="panel appearance-panel">
        <div className="settings-heading">
          <span className="settings-symbol">
            <Palette size={25} aria-hidden="true" />
          </span>
          <div>
            <h2>Пусть будет по-вашему</h2>
            <p>Выберите оформление, в котором удобно заниматься делами.</p>
          </div>
        </div>
        <ThemeOptions />
        <p className="settings-feedback" role="status" aria-live="polite">
          <Check size={16} aria-hidden="true" />
          {saved
            ? "Выбор сохраняется автоматически в этом браузере."
            : "Тема применена. Браузер запретил сохранение — после закрытия выбор может сброситься."}
        </p>
      </section>
      <aside className="panel settings-aside">
        <Monitor size={23} aria-hidden="true" />
        <h2>
          Один сервис,
          <br />
          ваш привычный вид.
        </h2>
        <p>
          Тема применяется к главной странице, всем кабинетам и формам входа.
        </p>
        <div className="settings-current">
          <span>Сейчас используется</span>
          <strong>
            {resolved === "dark" ? "Тёмная тема" : "Светлая тема"}
          </strong>
        </div>
        <p>
          В режиме «Как на устройстве» оформление меняется вместе с настройками
          системы.
        </p>
      </aside>
    </div>
  );
}
