import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Inter } from "next/font/google";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import { AppLayoutShell } from "@/components/AppLayoutShell";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "L2 Boss Tracker",
  description: "Lineage 2 raid boss tracker",
};

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: inter.style.fontFamily,
  headings: {
    fontFamily: inter.style.fontFamily,
    fontWeight: "600",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className={inter.className}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications position="top-center" zIndex={10000} autoClose={2500} />
          <AppLayoutShell>{children}</AppLayoutShell>
        </MantineProvider>
      </body>
    </html>
  );
}