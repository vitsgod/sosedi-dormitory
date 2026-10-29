export const THEME_KEY = "sosedi-theme";
export type ThemePreference = "light" | "dark" | "system";
export function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
// Runs in the head before the first paint. No user input is interpolated.
export const themeBootstrap = `(function(){var p='system';try{p=localStorage.getItem('sosedi-theme');}catch(e){}var t=p==='light'||p==='dark'?p:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='dark'?'#101722':'#f3f5f8';})();`;
