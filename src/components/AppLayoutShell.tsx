"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppShell,
  Box,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBell,
  IconHome2,
  IconSettings,
  IconRobot,
} from "@tabler/icons-react";
import { useState } from "react";

import { IconAdrenaline } from "@/components/IconAdrenaline";

const navItems = [
  { label: "Боссы", href: "/", icon: IconHome2 },
  { label: "Ручной треккинг", href: "/tracking", icon: IconBell },
  { label: "Бот треккинг", href: "/adrtracking", icon: IconAdrenaline },
  { label: "Настройки", href: "/settings", icon: IconSettings },
 
];

export function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <AppShell
        padding="lg"
        header={{ height: 72 }}
        footer={{ height: 44 }}
        styles={{
          main: {
            background: "#f6f8fb",
          },
          header: {
            background: "#ffffff",
            borderBottom: "1px solid #e9ecef",
          },
          footer: {
            background: "#ffffff",
            borderTop: "1px solid #e9ecef",
          },
        }}
      >
        <AppShell.Header>
          <Container size="xl" h="100%">
            <Group h="100%" justify="space-between" align="center">
              <Group gap="sm">
                <Burger
                  opened={opened}
                  onClick={() => setOpened((o) => !o)}
                  hiddenFrom="sm"
                  size="sm"
                />
                <Box>
                  <Link href="/tracking" style={{ textDecoration: "none" }}>
  <Title order={4} c="dark">
    L2 Boss Tracker
  </Title>
</Link>
                </Box>
              </Group>

              <Group gap="xs" visibleFrom="sm">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Button
                      key={item.href}
                      component={Link}
                      href={item.href}
                      variant={active ? "light" : "subtle"}
                      leftSection={<Icon size={17} stroke={1.8} />}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main>{children}</AppShell.Main>

        <AppShell.Footer>
          <Container size="xl" h="100%">
            <Group h="100%" justify="center" gap="md">
              <Text size="sm" c="dimmed">
                Developed by imfrozeN © 2026
              </Text>
              <Text size="sm" c="dimmed">
                v0.1
              </Text>
            </Group>
          </Container>
        </AppShell.Footer>
      </AppShell>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title="Navigation"
        hiddenFrom="sm"
        padding="md"
        size="xs"
      >
        <Stack gap="xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                onClick={() => setOpened(false)}
                variant={active ? "light" : "subtle"}
                justify="flex-start"
                leftSection={<Icon size={17} stroke={1.8} />}
                fullWidth
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>

        <Divider my="md" />

        <Text size="sm" c="dimmed">
          Control panel
        </Text>
      </Drawer>
    </>
  );
}