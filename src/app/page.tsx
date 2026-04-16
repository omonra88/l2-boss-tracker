"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  IconEdit,
  IconEyePlus,
  IconTrash,
} from "@tabler/icons-react";

type Boss = {
  id: number;
  name: string;
  level: number;
  bossType: "NORMAL" | "QUEST" | "EPIC" | "UNIQUE";
  location: string | null;
  respawnBaseMinutes: number;
  respawnRandomMinutes: number;
  respawnRandomMode: "PLUS" | "PLUS_MINUS";
};

type BossForm = {
  name: string;
  level: string;
  bossType: Boss["bossType"];
  baseHours: string;
  baseMinutes: string;
  randomMinutes: string;
  randomMode: Boss["respawnRandomMode"];
};

type BossSort =
  | "name_asc"
  | "name_desc"
  | "level_asc"
  | "level_desc"
  | "type_asc"
  | "type_desc"
  | "respawn_asc"
  | "respawn_desc";

const initialForm: BossForm = {
  name: "",
  level: "",
  bossType: "NORMAL",
  baseHours: "",
  baseMinutes: "",
  randomMinutes: "",
  randomMode: "PLUS",
};

function formatRespawn(boss: Boss) {
  const hours = Math.floor(boss.respawnBaseMinutes / 60);
  const minutes = boss.respawnBaseMinutes % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0) parts.push(`${minutes} м`);

  const base = parts.length > 0 ? parts.join(" ") : "0 м";

  if (!boss.respawnRandomMinutes) return base;

  return boss.respawnRandomMode === "PLUS"
    ? `${base} + ${boss.respawnRandomMinutes} м`
    : `${base} ± ${boss.respawnRandomMinutes} м`;
}

function formatBossType(type: Boss["bossType"]) {
  switch (type) {
    case "NORMAL":
      return "Обычный";
    case "QUEST":
      return "Квестовый";
    case "EPIC":
      return "Эпический";
    case "UNIQUE":
      return "Уникальный";
    default:
      return type;
  }
}

function getBossTypeColor(type: Boss["bossType"]) {
  switch (type) {
    case "EPIC":
      return "red";
    case "UNIQUE":
      return "yellow";
    case "QUEST":
      return "blue";
    case "NORMAL":
    default:
      return "gray";
  }
}

function bossToForm(boss: Boss): BossForm {
  return {
    name: boss.name,
    level: String(boss.level),
    bossType: boss.bossType,
    baseHours: String(Math.floor(boss.respawnBaseMinutes / 60)),
    baseMinutes: String(boss.respawnBaseMinutes % 60),
    randomMinutes: String(boss.respawnRandomMinutes),
    randomMode: boss.respawnRandomMode,
  };
}

function getRespawnSortValue(boss: Boss) {
  return boss.respawnBaseMinutes + boss.respawnRandomMinutes;
}

export default function HomePage() {
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<BossForm>(initialForm);
  const [editingBossId, setEditingBossId] = useState<number | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [bossToDelete, setBossToDelete] = useState<Boss | null>(null);

  const [filtersOpened, setFiltersOpened] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"ALL" | Boss["bossType"]>("ALL");
  const [levelMinFilter, setLevelMinFilter] = useState("");
  const [levelMaxFilter, setLevelMaxFilter] = useState("");
  const [sortBy, setSortBy] = useState<BossSort>("level_asc");

  useEffect(() => {
    loadBosses();

    const handler = () => {
      loadBosses();
    };

    window.addEventListener("bosses-updated", handler);

    return () => {
      window.removeEventListener("bosses-updated", handler);
    };
  }, []);

  async function loadBosses(showRefreshToast = false) {
    try {
      const res = await fetch("/api/bosses", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка загрузки боссов",
          color: "red",
        });
        return;
      }

      setBosses(Array.isArray(data) ? data : []);

      if (showRefreshToast) {
        notifications.show({
          title: "Обновлено",
          message: "Список боссов обновлён",
          color: "blue",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof BossForm>(key: K, value: BossForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingBossId(null);
  }

  function openCreateModal() {
    resetForm();
    setModalOpened(true);
  }

  function openEditModal(boss: Boss) {
    setEditingBossId(boss.id);
    setForm(bossToForm(boss));
    setModalOpened(true);
  }

  function closeModal() {
    if (saving) return;
    resetForm();
    setModalOpened(false);
  }

  function openDeleteModal(boss: Boss) {
    setBossToDelete(boss);
    setDeleteModalOpened(true);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModalOpened(false);
    setBossToDelete(null);
  }

  function resetFilters() {
    setTypeFilter("ALL");
    setLevelMinFilter("");
    setLevelMaxFilter("");
    setSortBy("level_asc");
  }

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const level = Number(form.level);
  const baseHours = Number(form.baseHours || 0);
  const baseMinutesPart = Number(form.baseMinutes || 0);
  const baseMinutes = baseHours * 60 + baseMinutesPart;
  const randomMinutes = Number(form.randomMinutes || 0);

  if (!form.name.trim()) {
    notifications.show({
      title: "Проверь форму",
      message: "Укажи название босса",
      color: "yellow",
    });
    return;
  }

  if (!Number.isFinite(level) || level <= 0 || !Number.isInteger(level)) {
    notifications.show({
      title: "Проверь форму",
      message: "Некорректный уровень босса",
      color: "yellow",
    });
    return;
  }

  if (
    !Number.isFinite(baseHours) ||
    baseHours < 0 ||
    !Number.isInteger(baseHours)
  ) {
    notifications.show({
      title: "Проверь форму",
      message: "Некорректные часы респавна",
      color: "yellow",
    });
    return;
  }

  if (
    !Number.isFinite(baseMinutesPart) ||
    baseMinutesPart < 0 ||
    baseMinutesPart > 59 ||
    !Number.isInteger(baseMinutesPart)
  ) {
    notifications.show({
      title: "Проверь форму",
      message: "Минуты респавна должны быть от 0 до 59",
      color: "yellow",
    });
    return;
  }

  if (
    !Number.isFinite(randomMinutes) ||
    randomMinutes < 0 ||
    !Number.isInteger(randomMinutes)
  ) {
    notifications.show({
      title: "Проверь форму",
      message: "Некорректный рандом респавна",
      color: "yellow",
    });
    return;
  }

  const payload = {
    name: form.name,
    level,
    bossType: form.bossType,
    location: null,
    respawnBaseMinutes: baseMinutes,
    respawnRandomMinutes: randomMinutes,
    respawnRandomMode: form.randomMode,
  };

  setSaving(true);

  try {
    const isEditing = editingBossId !== null;

    const res = await fetch(
      isEditing ? `/api/bosses/${editingBossId}` : "/api/bosses",
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      notifications.show({
        title: "Ошибка",
        message: data.error || data.details || "Не удалось сохранить босса",
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Успешно",
      message: isEditing
        ? `Босс обновлён: ${data.boss.name}`
        : `Босс добавлен: ${data.boss.name}`,
      color: "green",
    });

    closeModal();
    await loadBosses(false);
  } catch (error) {
    console.error("handleSubmit error:", error);
    notifications.show({
      title: "Ошибка",
      message: "Сетевая ошибка",
      color: "red",
    });
  } finally {
    setSaving(false);
  }
}

  async function addToTracking(bossId: number) {
    try {
      const res = await fetch("/api/tracked-bosses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bossId }),
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || data.details || "Ошибка при добавлении",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Мониторинг",
        message: `Добавлено в мониторинг: ${data.boss.name}`,
        color: "green",
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    }
  }

  async function confirmDeleteBoss() {
    if (!bossToDelete) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/bosses/${bossToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка при удалении",
          color: "red",
        });
        return;
      }

      setBosses((prev) => prev.filter((boss) => boss.id !== bossToDelete.id));

      if (editingBossId === bossToDelete.id) {
        closeModal();
      }

      notifications.show({
        title: "Удалено",
        message: `Босс удалён: ${bossToDelete.name}`,
        color: "green",
      });

      closeDeleteModal();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  }

  const filteredAndSortedBosses = useMemo(() => {
    const minLevel = levelMinFilter ? Number(levelMinFilter) : null;
    const maxLevel = levelMaxFilter ? Number(levelMaxFilter) : null;

    const filtered = bosses.filter((boss) => {
      if (typeFilter !== "ALL" && boss.bossType !== typeFilter) {
        return false;
      }

      if (minLevel !== null && !Number.isNaN(minLevel) && boss.level < minLevel) {
        return false;
      }

      if (maxLevel !== null && !Number.isNaN(maxLevel) && boss.level > maxLevel) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, "ru");
        case "name_desc":
          return b.name.localeCompare(a.name, "ru");
        case "level_asc":
          return a.level - b.level;
        case "level_desc":
          return b.level - a.level;
        case "type_asc":
          return formatBossType(a.bossType).localeCompare(
            formatBossType(b.bossType),
            "ru"
          );
        case "type_desc":
          return formatBossType(b.bossType).localeCompare(
            formatBossType(a.bossType),
            "ru"
          );
        case "respawn_asc":
          return getRespawnSortValue(a) - getRespawnSortValue(b);
        case "respawn_desc":
          return getRespawnSortValue(b) - getRespawnSortValue(a);
        default:
          return 0;
      }
    });
  }, [bosses, typeFilter, levelMinFilter, levelMaxFilter, sortBy]);

  const rows = filteredAndSortedBosses.map((boss) => (
    <Table.Tr key={boss.id}>
      <Table.Td>
        <Text fw={600} size="sm">
          {boss.name}
        </Text>
      </Table.Td>

      <Table.Td>
        <Text ta="center" size="sm">
          {boss.level}
        </Text>
      </Table.Td>

      <Table.Td>
        <Badge color={getBossTypeColor(boss.bossType)} variant="light" size="sm">
          {formatBossType(boss.bossType)}
        </Badge>
      </Table.Td>

      <Table.Td>
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {formatRespawn(boss)}
        </Text>
      </Table.Td>

      <Table.Td>
        <Group gap={6} wrap="nowrap" justify="center">
          <Tooltip label="Добавить в мониторинг" withArrow>
            <ActionIcon
              type="button"
              size="md"
              radius="sm"
              color="green"
              variant="filled"
              onClick={() => addToTracking(boss.id)}
              aria-label="Добавить в мониторинг"
            >
              <IconEyePlus size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Редактировать босса" withArrow>
            <ActionIcon
              type="button"
              size="md"
              radius="sm"
              variant="default"
              onClick={() => openEditModal(boss)}
              aria-label="Редактировать босса"
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Удалить босса" withArrow>
            <ActionIcon
              type="button"
              size="md"
              radius="sm"
              color="red"
              variant="filled"
              onClick={() => openDeleteModal(boss)}
              aria-label="Удалить босса"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Список рейд-боссов</Title>
            <Text c="dimmed" size="sm">
              Управление боссами и настройка респавна
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="default"
              onClick={() => {
                loadBosses(true);
              }}
            >
              Обновить
            </Button>
            <Button onClick={openCreateModal}>Добавить босса</Button>
          </Group>
        </Group>

        <Modal
          opened={modalOpened}
          onClose={closeModal}
          title={
            <Title order={4}>
              {editingBossId !== null ? "Редактировать босса" : "Добавить босса"}
            </Title>
          }
          centered
          size="lg"
        >
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Название"
                placeholder="Название босса"
                value={form.name}
                onChange={(e) => updateForm("name", e.currentTarget.value)}
              />

              <Group grow align="start">
                <TextInput
                  label="LVL"
                  placeholder="Уровень"
                  value={form.level}
                  onChange={(e) => updateForm("level", e.currentTarget.value)}
                />

                <Select
                  label="Тип босса"
                  value={form.bossType}
                  onChange={(value) =>
                    value && updateForm("bossType", value as Boss["bossType"])
                  }
                  data={[
                    { value: "NORMAL", label: "Обычный" },
                    { value: "QUEST", label: "Квестовый" },
                    { value: "EPIC", label: "Эпический" },
                    { value: "UNIQUE", label: "Уникальный" },
                  ]}
                />
              </Group>

              <Group grow align="start">
                <TextInput
                  label="Часы"
                  placeholder="0"
                  value={form.baseHours}
                  onChange={(e) => updateForm("baseHours", e.currentTarget.value)}
                />

                <TextInput
                  label="Минуты"
                  placeholder="0"
                  value={form.baseMinutes}
                  onChange={(e) => updateForm("baseMinutes", e.currentTarget.value)}
                />

                <TextInput
                  label="Рандом (мин)"
                  placeholder="0"
                  value={form.randomMinutes}
                  onChange={(e) =>
                    updateForm("randomMinutes", e.currentTarget.value)
                  }
                />
              </Group>

              <Select
                label="Режим рандома"
                value={form.randomMode}
                onChange={(value) =>
                  value &&
                  updateForm("randomMode", value as Boss["respawnRandomMode"])
                }
                data={[
                  { value: "PLUS", label: "+" },
                  { value: "PLUS_MINUS", label: "±" },
                ]}
              />

              <Group justify="flex-end">
                <Button variant="default" onClick={closeModal}>
                  Отмена
                </Button>
                <Button type="submit" loading={saving}>
                  {editingBossId !== null ? "Сохранить изменения" : "Добавить босса"}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={deleteModalOpened}
          onClose={closeDeleteModal}
          title={<Title order={4}>Подтверждение удаления</Title>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Удалить босса{" "}
              <Text span fw={700}>
                {bossToDelete?.name ?? ""}
              </Text>{" "}
              из общего списка?
            </Text>

            {bossToDelete && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Имя
                    </Text>
                    <Text size="sm" fw={600}>
                      {bossToDelete.name}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Уровень
                    </Text>
                    <Text size="sm">{bossToDelete.level}</Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Тип
                    </Text>
                    <Badge
                      color={getBossTypeColor(bossToDelete.bossType)}
                      variant="light"
                    >
                      {formatBossType(bossToDelete.bossType)}
                    </Badge>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button variant="default" onClick={closeDeleteModal} disabled={deleting}>
                Отмена
              </Button>
              <Button color="red" onClick={confirmDeleteBoss} loading={deleting}>
                Удалить
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Title order={4}>Список боссов</Title>
                <Text size="sm" c="dimmed">
                  Найдено: {filteredAndSortedBosses.length}
                </Text>
              </div>

              <Button
                variant={filtersOpened ? "filled" : "default"}
                onClick={() => setFiltersOpened((prev) => !prev)}
              >
                {filtersOpened ? "Скрыть фильтры" : "Показать фильтры"}
              </Button>
            </Group>

            {filtersOpened && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group grow align="end">
                    <Select
                      label="Тип"
                      value={typeFilter}
                      onChange={(value) =>
                        value && setTypeFilter(value as "ALL" | Boss["bossType"])
                      }
                      data={[
                        { value: "ALL", label: "Все типы" },
                        { value: "NORMAL", label: "Обычный" },
                        { value: "QUEST", label: "Квестовый" },
                        { value: "EPIC", label: "Эпический" },
                        { value: "UNIQUE", label: "Уникальный" },
                      ]}
                    />

                    <TextInput
                      label="Уровень от"
                      placeholder="Например, 20"
                      value={levelMinFilter}
                      onChange={(e) => setLevelMinFilter(e.currentTarget.value)}
                    />

                    <TextInput
                      label="Уровень до"
                      placeholder="Например, 80"
                      value={levelMaxFilter}
                      onChange={(e) => setLevelMaxFilter(e.currentTarget.value)}
                    />

                    <Select
                      label="Сортировка"
                      value={sortBy}
                      onChange={(value) => value && setSortBy(value as BossSort)}
                      data={[
                        { value: "level_asc", label: "LVL ↑" },
                        { value: "level_desc", label: "LVL ↓" },
                        { value: "name_asc", label: "Имя А-Я" },
                        { value: "name_desc", label: "Имя Я-А" },
                        { value: "type_asc", label: "Тип А-Я" },
                        { value: "type_desc", label: "Тип Я-А" },
                        { value: "respawn_asc", label: "Респавн ↑" },
                        { value: "respawn_desc", label: "Респавн ↓" },
                      ]}
                    />
                  </Group>

                  <Group justify="flex-end">
                    <Button variant="default" onClick={resetFilters}>
                      Сбросить фильтры
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}

            {loading ? (
              <Paper withBorder radius="md" p="lg">
                <Group>
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">
                    Загрузка...
                  </Text>
                </Group>
              </Paper>
            ) : filteredAndSortedBosses.length === 0 ? (
              <Alert variant="light" color="gray" title="Ничего не найдено">
                По текущим фильтрам ничего не найдено
              </Alert>
            ) : (
              <ScrollArea>
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
                  horizontalSpacing="sm"
                  verticalSpacing="xs"
                  style={{
                    tableLayout: "auto",
                    fontSize: "13px",
                    width: "100%",
                  }}
                >
                  <Table.Thead
                    style={{
                      background: "#f8f9fa",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    <Table.Tr>
                      <Table.Th style={{ width: "42%" }}>
                        <Text size="sm" fw={600}>
                          Имя
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "8%" }}>
                        <Text size="sm" fw={600}>
                          LVL
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "14%" }}>
                        <Text size="sm" fw={600}>
                          Тип
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "18%" }}>
                        <Text size="sm" fw={600}>
                          Респавн
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "18%" }}>
                        <Text size="sm" fw={600}>
                          Действия
                        </Text>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>{rows}</Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}