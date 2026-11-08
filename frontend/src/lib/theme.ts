export type ThemeMode = "dark" | "light";

export const getSavedTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("devsync_theme");
  return (stored as ThemeMode) || "dark";
};

export const saveTheme = (theme: ThemeMode) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("devsync_theme", theme);
    if (theme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
  }
};
