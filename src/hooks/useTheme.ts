import { useEffect, useMemo } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

function applyTheme(theme: string) {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("light", "dark");

  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.add("light");
  }
  // "system" — no class, uses @media (prefers-color-scheme: dark) in CSS
}

/** Returns true if the effective theme is dark */
function isDarkMode(theme: string): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  // system
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings);
  const theme = settings?.theme ?? "system";

  // Apply theme class when setting changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      // Re-apply to ensure no stale classes
      applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
}

/** Returns the Monaco editor theme string based on current app theme */
export function useMonacoTheme(): string {
  const settings = useSettingsStore((s) => s.settings);
  const theme = settings?.theme ?? "system";
  return useMemo(() => (isDarkMode(theme) ? "vs-dark" : "light"), [theme]);
}
