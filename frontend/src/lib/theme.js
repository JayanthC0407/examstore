import { useEffect, useState } from "react";

const KEY = "es-theme";

const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches;

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(() => read() || (systemDark() ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}
