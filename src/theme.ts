export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "daggerlight-theme";
const listeners = new Set<() => void>();
let currentTheme: ThemeMode = "light";
let initialized = false;

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    currentTheme = window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    currentTheme = "light";
  }
  applyTheme(currentTheme);

  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;
    const next = event.newValue === "dark" ? "dark" : "light";
    if (currentTheme === next) return;
    currentTheme = next;
    applyTheme(currentTheme);
    listeners.forEach(listener => listener());
  });
}

export function getTheme(): ThemeMode {
  initializeTheme();
  return currentTheme;
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setTheme(theme: ThemeMode) {
  initializeTheme();
  if (currentTheme === theme) return;
  currentTheme = theme;
  applyTheme(theme);
  try { window.localStorage.setItem(STORAGE_KEY, theme); }
  catch { /* Continue with a session-only theme when storage is disabled. */ }
  listeners.forEach(listener => listener());
}
