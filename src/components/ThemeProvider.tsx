"use client";

import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
} from "@mantine/core";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeModeContextValue = {
  colorScheme: ThemeMode;
  toggleColorScheme: () => void;
  setColorScheme: (value: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  colors: {
    blue: [
      "#eef6ff",
      "#d9ebff",
      "#bfdcff",
      "#9bc8ff",
      "#74b1ff",
      "#549cff",
      "#3d8dff",
      "#2d7be6",
      "#236dcd",
      "#175db3",
    ],
    gray: [
      "#f8f9fb",
      "#f1f3f5",
      "#e9ecef",
      "#dde1e6",
      "#ced4da",
      "#adb5bd",
      "#868e96",
      "#5c6770",
      "#343a40",
      "#1f2933",
    ],
  },
});

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [colorScheme, setColorScheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("app-color-scheme");

    if (saved === "light" || saved === "dark") {
      setColorScheme(saved);
      return;
    }

    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    setColorScheme(systemPrefersDark ? "dark" : "light");
  }, []);

  function handleSetColorScheme(value: ThemeMode) {
    setColorScheme(value);
    window.localStorage.setItem("app-color-scheme", value);
  }

  function toggleColorScheme() {
    handleSetColorScheme(colorScheme === "dark" ? "light" : "dark");
  }

  const contextValue = useMemo(
    () => ({
      colorScheme,
      toggleColorScheme,
      setColorScheme: handleSetColorScheme,
    }),
    [colorScheme]
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
  {children}
</MantineProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error("useThemeMode must be used inside ThemeProvider");
  }

  return context;
}

export { ColorSchemeScript };