"use client";

import Link from "next/link";
import { Button, Container, Group, Paper, Text, Title } from "@mantine/core";

export function AppHeader() {
  return (
    <Paper withBorder shadow="sm" radius={0}>
      <Container size="xl" py="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={3}>L2 Boss Tracker</Title>
            <Text size="sm" c="dimmed">
              Track raid bosses, respawns and settings
            </Text>
          </div>

          <Group gap="xs">
            <Button component={Link} href="/" variant="subtle">
              Bosses
            </Button>
            <Button component={Link} href="/tracking" variant="subtle">
              Tracking
            </Button>
            <Button component={Link} href="/settings" variant="subtle">
              Settings
            </Button>
          </Group>
        </Group>
      </Container>
    </Paper>
  );
}