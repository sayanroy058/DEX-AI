export type ThemeMode = "dark" | "light" | "other";

const THEME_STORAGE_KEY = "dex-theme";
const VALID_THEMES: ThemeMode[] = ["dark", "light", "other"];
const BROWSER_THEME_COLORS: Record<ThemeMode, string> = {
  dark: "#080808",
  light: "#f2f4f7",
  other: "#0b0c13",
};

export function readTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  // Preserve the user's previous third-theme choice after renaming the old
  // ocean palette to the more accurate "Other" mode.
  if (savedTheme === "ocean") return "other";

  return VALID_THEMES.includes(savedTheme as ThemeMode)
    ? (savedTheme as ThemeMode)
    : "dark";
}

export function applyTheme(theme: ThemeMode, persist = true) {
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme !== "light");
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", BROWSER_THEME_COLORS[theme]);

  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  window.dispatchEvent(
    new CustomEvent<ThemeMode>("dex-theme-change", { detail: theme }),
  );
}

export function initializeTheme() {
  applyTheme(readTheme(), false);
}
