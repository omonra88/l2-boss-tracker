import type { Metadata } from "next";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import { AppLayoutShell } from "@/components/AppLayoutShell";
import { ColorSchemeScript, ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "L2 Boss Tracker",
  description: "Lineage 2 raid boss tracker",
};

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
      <body>
        <ThemeProvider>
          <Notifications
            position="top-center"
            zIndex={10000}
            autoClose={2500}
          />
          <AppLayoutShell>{children}</AppLayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}