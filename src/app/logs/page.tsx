"use client";

import { useEffect, useState, useCallback } from "react";
import { notifications } from "@mantine/notifications";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconTrash, IconRefresh, IconSearch } from "@tabler/icons-react";
import { formatDateInTimeZone } from "@/lib/date-utils";

type AdrBossEvent = {
  id: number;
  bossName: string;
  eventType: string;
  rawText: string | null;
  source: string | null;
  createdAt: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const LIMIT = 50;

function getEventTypeColor(eventType: string) {
  switch (eventType) {
    case "DEAD":
      return "red";
    case "RESPAWN":
      return "green";
    default:
      return "gray";
  }
}

function getEventTypeLabel(eventType: string) {
  switch (eventType) {
    case "DEAD":
      return "Убит";
    case "RESPAWN":
      return "Респавн";
    default:
      return eventType;
  }
}

export default function LogsPage() {
  const [events, setEvents] = useState<AdrBossEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearModalOpened, setClearModalOpened] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [page, setPage] = useState(1);
  const [bossNameFilter, setBossNameFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const [timezone, setTimezone] = useState("Europe/Kyiv");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings?.timezone) setTimezone(data.settings.timezone);
      })
      .catch(() => {});
  }, []);

  const loadEvents = useCallback(
    async (showToast = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(LIMIT));
        if (bossNameFilter.trim()) params.set("bossName", bossNameFilter.trim());
        if (eventTypeFilter) params.set("eventType", eventTypeFilter);
        if (sourceFilter) params.set("source", sourceFilter);

        const res = await fetch(`/api/logs?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          notifications.show({
            title: "Ошибка",
            message: data.error || "Не удалось загрузить логи",
            color: "red",
          });
          return;
        }

        setEvents(data.events ?? []);
        setPagination(data.pagination ?? null);

        if (showToast) {
          notifications.show({
            title: "Обновлено",
            message: "Логи обновлены",
            color: "green",
          });
        }
      } catch {
        notifications.show({
          title: "Ошибка",
          message: "Сетевая ошибка при загрузке логов",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    },
    [page, bossNameFilter, eventTypeFilter, sourceFilter]
  );

  useEffect(() => {
    void loadEvents(false);
  }, [loadEvents]);

  async function clearLogs() {
    setClearing(true);
    try {
      const res = await fetch("/api/logs?confirm=true", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Не удалось очистить логи",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Логи очищены",
        message: `Удалено записей: ${data.deletedCount}`,
        color: "green",
      });

      setClearModalOpened(false);
      setPage(1);
      await loadEvents(false);
    } catch {
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка при очистке",
        color: "red",
      });
    } finally {
      setClearing(false);
    }
  }

  function resetFilters() {
    setBossNameFilter("");
    setEventTypeFilter(null);
    setSourceFilter(null);
    setPage(1);
  }

  const rows = events.map((event) => (
    <Table.Tr key={event.id}>
      <Table.Td>
        <Text size="sm" c="dimmed" ff="monospace">
          {event.id}
        </Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm" fw={600}>
          {event.bossName}
        </Text>
      </Table.Td>

      <Table.Td>
        <Badge
          size="sm"
          color={getEventTypeColor(event.eventType)}
          variant="light"
          styles={{
            root: { fontWeight: 600, letterSpacing: "1px" },
            label: { opacity: 1 },
          }}
        >
          {getEventTypeLabel(event.eventType)}
        </Badge>
      </Table.Td>

      <Table.Td>
        <Text size="sm" c="dimmed">
          {event.source ?? "—"}
        </Text>
      </Table.Td>

      <Table.Td>
        <Text
          size="xs"
          c="dimmed"
          style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={event.rawText ?? ""}
        >
          {event.rawText ?? "—"}
        </Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {formatDateInTimeZone(new Date(event.createdAt), timezone)}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Логи событий</Title>
            <Text c="dimmed" size="sm">
              История событий от бота и трекера боссов
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              onClick={() => loadEvents(true)}
              loading={loading}
            >
              Обновить
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={() => setClearModalOpened(true)}
            >
              Очистить логи
            </Button>
          </Group>
        </Group>

        {/* Фильтры */}
        <Card withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group gap="sm" wrap="wrap">
              <TextInput
                placeholder="Имя босса..."
                value={bossNameFilter}
                onChange={(e) => {
                  setBossNameFilter(e.currentTarget.value);
                  setPage(1);
                }}
                leftSection={<IconSearch size={15} />}
                style={{ minWidth: 200 }}
              />

              <Select
                placeholder="Тип события"
                value={eventTypeFilter}
                onChange={(v) => {
                  setEventTypeFilter(v);
                  setPage(1);
                }}
                clearable
                data={[
                  { value: "DEAD", label: "Убит" },
                  { value: "RESPAWN", label: "Респавн" },
                ]}
                style={{ minWidth: 150 }}
              />

              <Select
                placeholder="Источник"
                value={sourceFilter}
                onChange={(v) => {
                  setSourceFilter(v);
                  setPage(1);
                }}
                clearable
                data={[
                  { value: "telegram", label: "Telegram" },
                  { value: "manual", label: "Вручную" },
                ]}
                style={{ minWidth: 160 }}
              />

              <Button variant="default" onClick={resetFilters}>
                Сбросить
              </Button>
            </Group>

            {pagination && (
              <Text size="xs" c="dimmed">
                Найдено записей: {pagination.total}
              </Text>
            )}
          </Stack>
        </Card>

        {/* Таблица */}
        <Card withBorder radius="md" p="lg">
          {loading ? (
            <Paper withBorder radius="md" p="lg">
              <Group>
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Загрузка...
                </Text>
              </Group>
            </Paper>
          ) : events.length === 0 ? (
            <Alert variant="light" color="gray" title="Нет событий">
              По текущим фильтрам событий не найдено.
            </Alert>
          ) : (
            <Stack gap="md">
              <ScrollArea>
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
                  horizontalSpacing="sm"
                  verticalSpacing="xs"
                  style={{ tableLayout: "auto", fontSize: "13px", width: "100%" }}
                >
                  <Table.Thead
                    style={{
                      background: "#f8f9fa",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    <Table.Tr>
                      <Table.Th style={{ width: "5%" }}>
                        <Text size="sm" fw={600}>#</Text>
                      </Table.Th>
                      <Table.Th style={{ width: "20%" }}>
                        <Text size="sm" fw={600}>Босс</Text>
                      </Table.Th>
                      <Table.Th style={{ width: "12%" }}>
                        <Text size="sm" fw={600}>Событие</Text>
                      </Table.Th>
                      <Table.Th style={{ width: "12%" }}>
                        <Text size="sm" fw={600}>Источник</Text>
                      </Table.Th>
                      <Table.Th style={{ width: "31%" }}>
                        <Text size="sm" fw={600}>Сырой текст</Text>
                      </Table.Th>
                      <Table.Th style={{ width: "20%" }}>
                        <Text size="sm" fw={600}>Время</Text>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>{rows}</Table.Tbody>
                </Table>
              </ScrollArea>

              {/* Пагинация */}
              {pagination && pagination.totalPages > 1 && (
                <Group justify="center" gap="xs">
                  <Button
                    variant="default"
                    size="xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Назад
                  </Button>

                  <Text size="sm" c="dimmed">
                    Стр. {page} / {pagination.totalPages}
                  </Text>

                  <Button
                    variant="default"
                    size="xs"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Вперёд →
                  </Button>
                </Group>
              )}
            </Stack>
          )}
        </Card>
      </Stack>

      {/* Модалка подтверждения очистки */}
      <Modal
        opened={clearModalOpened}
        onClose={() => setClearModalOpened(false)}
        title={<Title order={4}>Очистить все логи?</Title>}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Это действие удалит{" "}
            <Text span fw={700}>
              все {pagination?.total ?? ""} записей
            </Text>{" "}
            из таблицы событий. Отменить будет невозможно.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setClearModalOpened(false)}
              disabled={clearing}
            >
              Отмена
            </Button>
            <Button color="red" loading={clearing} onClick={clearLogs}>
              Очистить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
