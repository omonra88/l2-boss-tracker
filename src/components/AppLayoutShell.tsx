"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
  Divider,
  Box,
} from "@mantine/core";
import {
  IconBell,
  IconSettings,
  IconHome2,
} from "@tabler/icons-react";
import { useState } from "react";

const navItems = [
  { label: "Bosses", href: "/", icon: IconHome2 },
  { label: "Tracking", href: "/tracking", icon: IconBell },
  { label: "Settings", href: "/settings", icon: IconSettings },
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
    <AppShell
      padding="lg"
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      header={{ height: 64 }}
      footer={{ height: 44 }}
      styles={{
        main: {
          background: "#f6f8fb",
        },
        header: {
          background: "#ffffff",
          borderBottom: "1px solid #e9ecef",
        },
        navbar: {
          background: "#ffffff",
          borderRight: "1px solid #e9ecef",
        },
        footer: {
          background: "#ffffff",
          borderTop: "1px solid #e9ecef",
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <Title order={4} c="dark">
              L2 Boss Tracker
            </Title>
          </Group>

          <Group gap="sm">
  {/* <ActionIcon
    variant="light"
    onClick={toggleColorScheme}
    size="lg"
    aria-label="Переключить тему"
  >
    {colorScheme === "dark" ? (
      <IconSun size={18} />
    ) : (
      <IconMoon size={18} />
    )}
  </ActionIcon> */}

  <Text size="sm" c="dimmed">
    Control panel
  </Text>
</Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="md" h="100%">
          <Box>
            <Text size="sm" fw={700} c="dimmed">
              NAVIGATION
            </Text>
          </Box>

          <Divider />

          <Stack gap={6}>
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  onClick={() => setOpened(false)}
                  active={isActive(item.href)}
                  label={item.label}
                  leftSection={<Icon size={18} stroke={1.8} />}
                  styles={{
                    root: {
                      borderRadius: 8,
                    },
                  }}
                />
              );
            })}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer>
        <Group h="100%" px="md" justify="center">
          <Text size="sm" c="dimmed">
            Developed by imfrozeN © 2026
          </Text>
          <Text size="sm" c="dimmed">
            v0.1
          </Text>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}