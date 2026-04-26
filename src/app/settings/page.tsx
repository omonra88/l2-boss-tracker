"use client";

import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NavLink,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBell,
  IconKey,
  IconRadar,
  IconSettings,
  IconSword,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimezoneMode = "AUTO" | "MANUAL";
type BossType = "NORMAL" | "QUEST" | "EPIC" | "UNIQUE";
type RespawnRandomMode = "PLUS" | "PLUS_MINUS";
type SoundNotificationMode =
  | "NONE"
  | "RANDOM_WINDOW_START"
  | "RESPAWN_WINDOW_END"
  | "BOTH";

type BossTypeSetting = {
  id: number;
  bossType: BossType;
  respawnBaseMinutes: number;
  respawnRandomMinutes: number;
  respawnRandomMode: RespawnRandomMode;
};

type SettingsResponse = {
  settings: {
    id: number;
    timezoneMode: TimezoneMode;
    timezone: string;
    showScoutCredentials: boolean;
    soundNotificationMode: SoundNotificationMode;
    scannerOnline: boolean;
  };
  bossTypeSettings: BossTypeSetting[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBossType(type: BossType) {
  switch (type) {
    case "NORMAL":   return "Обычный";
    case "QUEST":    return "Квестовый";
    case "EPIC":     return "Эпический";
    case "UNIQUE":   return "Уникальный";
    default:         return type;
  }
}

function splitMinutes(totalMinutes: number) {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

function getBossTypeColor(type: BossType) {
  switch (type) {
    case "EPIC":   return "red";
    case "UNIQUE": return "yellow";
    case "QUEST":  return "blue";
    default:       return "gray";
  }
}

// ─── Section keys ─────────────────────────────────────────────────────────────

type SectionKey = "general" | "notifications" | "accounts" | "respawn" | "scanner";

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: "general",
    label: "Общие",
    icon: <IconSettings size={16} />,
    description: "Часовой пояс и отображение времени",
  },
  {
    key: "notifications",
    label: "Уведомления",
    icon: <IconBell size={16} />,
    description: "Звуковые события для треккинга",
  },
  {
    key: "accounts",
    label: "Аккаунты",
    icon: <IconKey size={16} />,
    description: "Видимость аккаунтов скаутов",
  },
  {
    key: "respawn",
    label: "Шаблоны респавна",
    icon: <IconSword size={16} />,
    description: "Параметры по типам боссов",
  },
  {
    key: "scanner",
    label: "Сканер",
    icon: <IconRadar size={16} />,
    description: "Статус внешнего сканера",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");

  // state: general
  const [timezone, setTimezone]           = useState("Europe/Kyiv");
  const [timezoneMode, setTimezoneMode]   = useState<TimezoneMode>("AUTO");

  // state: notifications
  const [soundNotificationMode, setSoundNotificationMode] =
    useState<SoundNotificationMode>("NONE");

  // state: accounts
  const [accountsEnabled, setAccountsEnabled] = useState(false);

  // state: respawn
  const [bossTypeSettings, setBossTypeSettings] = useState<BossTypeSetting[]>([]);
  const [applyingType, setApplyingType]           = useState<BossType | null>(null);
  const [confirmModalOpened, setConfirmModalOpened]       = useState(false);
  const [selectedApplySetting, setSelectedApplySetting]   = useState<BossTypeSetting | null>(null);

  // state: level range apply (respawn tab)
  const [levelRangeForm, setLevelRangeForm] = useState({
    levelMin: "",
    levelMax: "",
    baseHours: "",
    baseMinutes: "",
    randomMinutes: "",
    randomMode: "PLUS" as RespawnRandomMode,
  });
  const [levelRangeConfirmOpened, setLevelRangeConfirmOpened] = useState(false);
  const [applyingLevelRange, setApplyingLevelRange]           = useState(false);

  // state: scanner
  const [scannerOnline, setScannerOnline] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => { loadSettings(); }, []);

  function playNotificationSound() {
    try {
      const audio = new Audio("/sounds/notify.mp3");
      audio.volume = 1;
      void audio.play().catch(() => {
        notifications.show({ title: "Ошибка", message: "Не удалось воспроизвести звук.", color: "red" });
      });
    } catch {
      notifications.show({ title: "Ошибка", message: "Не удалось инициализировать звук", color: "red" });
    }
  }

  async function loadSettings(showRefreshToast = false) {
    try {
      const res  = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json() as SettingsResponse | { error?: string };

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: (data as { error?: string }).error || "Ошибка загрузки настроек",
          color: "red",
        });
        return;
      }

      const d = data as SettingsResponse;
      setTimezoneMode(d.settings.timezoneMode ?? "AUTO");
      setTimezone(d.settings.timezone);
      setAccountsEnabled(Boolean(d.settings.showScoutCredentials));
      setSoundNotificationMode(d.settings.soundNotificationMode ?? "NONE");
      setBossTypeSettings(d.bossTypeSettings);
      setScannerOnline(Boolean(d.settings.scannerOnline));

      if (showRefreshToast) {
        notifications.show({ title: "Обновлено", message: "Настройки обновлены", color: "blue" });
      }
    } catch {
      notifications.show({ title: "Ошибка", message: "Сетевая ошибка", color: "red" });
    } finally {
      setLoading(false);
    }
  }

  // ── BossTypeSetting helpers ──────────────────────────────────────────────────

  function updateBaseHours(bossType: BossType, value: string | number) {
    const hours = typeof value === "number" ? value : Number(value || 0);
    setBossTypeSettings((prev) =>
      prev.map((item) => {
        if (item.bossType !== bossType) return item;
        const minutes = item.respawnBaseMinutes % 60;
        return { ...item, respawnBaseMinutes: (Number.isFinite(hours) ? hours : 0) * 60 + minutes };
      })
    );
  }

  function updateBaseMinutes(bossType: BossType, value: string | number) {
    const minutes = typeof value === "number" ? value : Number(value || 0);
    setBossTypeSettings((prev) =>
      prev.map((item) => {
        if (item.bossType !== bossType) return item;
        const hours = Math.floor(item.respawnBaseMinutes / 60);
        return { ...item, respawnBaseMinutes: hours * 60 + (Number.isFinite(minutes) ? minutes : 0) };
      })
    );
  }

  function updateRandomMinutes(bossType: BossType, value: string | number) {
    const randomMinutes = typeof value === "number" ? value : Number(value || 0);
    setBossTypeSettings((prev) =>
      prev.map((item) =>
        item.bossType === bossType
          ? { ...item, respawnRandomMinutes: Number.isFinite(randomMinutes) ? randomMinutes : 0 }
          : item
      )
    );
  }

  function updateRandomMode(bossType: BossType, value: string) {
    setBossTypeSettings((prev) =>
      prev.map((item) =>
        item.bossType === bossType
          ? { ...item, respawnRandomMode: value as RespawnRandomMode }
          : item
      )
    );
  }

  function validateSetting(item: BossTypeSetting) {
    if (!Number.isFinite(item.respawnBaseMinutes) || item.respawnBaseMinutes <= 0) {
      notifications.show({
        title: "Проверь данные",
        message: `Некорректный базовый респавн для типа ${formatBossType(item.bossType)}`,
        color: "yellow",
      });
      return false;
    }
    if (!Number.isFinite(item.respawnRandomMinutes) || item.respawnRandomMinutes < 0) {
      notifications.show({
        title: "Проверь данные",
        message: `Некорректный рандом для типа ${formatBossType(item.bossType)}`,
        color: "yellow",
      });
      return false;
    }
    return true;
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function saveSettings() {
    for (const item of bossTypeSettings) {
      if (!validateSetting(item)) return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezoneMode,
          timezone,
          showScoutCredentials: accountsEnabled,
          soundNotificationMode,
          bossTypeSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifications.show({ title: "Ошибка", message: data.error || "Ошибка при сохранении настроек", color: "red" });
        return;
      }
      setTimezoneMode(data.settings.timezoneMode ?? "AUTO");
      setTimezone(data.settings.timezone);
      setAccountsEnabled(Boolean(data.settings.showScoutCredentials));
      setSoundNotificationMode(data.settings.soundNotificationMode ?? "NONE");
      setBossTypeSettings(data.bossTypeSettings);
      notifications.show({ title: "Успешно", message: "Настройки сохранены", color: "green" });
      await loadSettings(false);
    } catch {
      notifications.show({ title: "Ошибка", message: "Сетевая ошибка", color: "red" });
    } finally {
      setSaving(false);
    }
  }

  // ── Apply by type ─────────────────────────────────────────────────────────────

  function requestApplyType(setting: BossTypeSetting) {
    if (!validateSetting(setting)) return;
    setSelectedApplySetting(setting);
    setConfirmModalOpened(true);
  }

  async function confirmApplyType() {
    if (!selectedApplySetting) return;
    const setting = selectedApplySetting;
    setApplyingType(setting.bossType);
    try {
      const res = await fetch("/api/settings/apply-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bossType: setting.bossType,
          respawnBaseMinutes: setting.respawnBaseMinutes,
          respawnRandomMinutes: setting.respawnRandomMinutes,
          respawnRandomMode: setting.respawnRandomMode,
        }),
      });
      const text = await res.text();
      let data: { updatedCount?: number; error?: string };
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!res.ok) {
        notifications.show({ title: "Ошибка", message: data.error || "Ошибка при применении шаблона", color: "red" });
        return;
      }
      notifications.show({
        title: "Применено",
        message: `Обновлено боссов: ${data.updatedCount ?? 0}`,
        color: "green",
      });
      setConfirmModalOpened(false);
      setSelectedApplySetting(null);
    } catch {
      notifications.show({ title: "Ошибка", message: "Сетевая ошибка", color: "red" });
    } finally {
      setApplyingType(null);
    }
  }

  // ── Apply by level range ──────────────────────────────────────────────────────

  function requestApplyLevelRange() {
    const { levelMin, levelMax, baseHours, baseMinutes } = levelRangeForm;
    if (!levelMin || !levelMax || Number(levelMin) > Number(levelMax)) {
      notifications.show({ title: "Проверь данные", message: "Некорректный диапазон уровней", color: "yellow" });
      return;
    }
    const totalBase = Number(baseHours || 0) * 60 + Number(baseMinutes || 0);
    if (totalBase <= 0) {
      notifications.show({ title: "Проверь данные", message: "Базовый респавн должен быть больше 0", color: "yellow" });
      return;
    }
    setLevelRangeConfirmOpened(true);
  }

  async function confirmApplyLevelRange() {
    setApplyingLevelRange(true);
    try {
      const res = await fetch("/api/settings/apply-level-range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelMin: Number(levelRangeForm.levelMin),
          levelMax: Number(levelRangeForm.levelMax),
          respawnBaseMinutes: Number(levelRangeForm.baseHours || 0) * 60 + Number(levelRangeForm.baseMinutes || 0),
          respawnRandomMinutes: Number(levelRangeForm.randomMinutes || 0),
          respawnRandomMode: levelRangeForm.randomMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifications.show({ title: "Ошибка", message: data.error || "Ошибка при применении", color: "red" });
        return;
      }
      notifications.show({
        title: "Применено",
        message: `Обновлено боссов: ${data.updatedCount ?? 0}`,
        color: "green",
      });
      setLevelRangeConfirmOpened(false);
    } catch {
      notifications.show({ title: "Ошибка", message: "Сетевая ошибка", color: "red" });
    } finally {
      setApplyingLevelRange(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const currentSection = SECTIONS.find((s) => s.key === activeSection)!;

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Paper withBorder radius="md" p="lg">
          <Group>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Загрузка настроек...</Text>
          </Group>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      {/* ── Confirm apply-type modal ─────────────────────────────────────────── */}
      <Modal
        opened={confirmModalOpened}
        onClose={() => { if (applyingType) return; setConfirmModalOpened(false); setSelectedApplySetting(null); }}
        title={<Title order={4}>Подтверждение применения шаблона</Title>}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Применить шаблон{" "}
            <Text span fw={700}>"{selectedApplySetting ? formatBossType(selectedApplySetting.bossType) : ""}"</Text>{" "}
            ко всем боссам этого типа?
          </Text>
          {selectedApplySetting && (
            <Paper withBorder radius="md" p="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Тип</Text>
                  <Badge color={getBossTypeColor(selectedApplySetting.bossType)} variant="light">
                    {formatBossType(selectedApplySetting.bossType)}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Базовый респавн</Text>
                  <Text size="sm">
                    {splitMinutes(selectedApplySetting.respawnBaseMinutes).hours} ч{" "}
                    {splitMinutes(selectedApplySetting.respawnBaseMinutes).minutes} м
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Рандом</Text>
                  <Text size="sm">
                    {selectedApplySetting.respawnRandomMode === "PLUS" ? "+" : "±"}{" "}
                    {selectedApplySetting.respawnRandomMinutes} м
                  </Text>
                </Group>
              </Stack>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { setConfirmModalOpened(false); setSelectedApplySetting(null); }} disabled={Boolean(applyingType)}>
              Отмена
            </Button>
            <Button onClick={confirmApplyType} loading={Boolean(applyingType)}>Применить</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Confirm apply-level-range modal ──────────────────────────────────── */}
      <Modal
        opened={levelRangeConfirmOpened}
        onClose={() => { if (!applyingLevelRange) setLevelRangeConfirmOpened(false); }}
        title={<Title order={4}>Подтверждение применения по уровням</Title>}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Применить новый респавн ко всем боссам уровней{" "}
            <Text span fw={700}>{levelRangeForm.levelMin}–{levelRangeForm.levelMax}</Text>?
            Текущие значения будут перезаписаны.
          </Text>
          <Paper withBorder radius="md" p="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Диапазон уровней</Text>
                <Text size="sm" fw={600}>{levelRangeForm.levelMin} – {levelRangeForm.levelMax}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Базовый респавн</Text>
                <Text size="sm" fw={600}>
                  {Number(levelRangeForm.baseHours || 0)} ч {Number(levelRangeForm.baseMinutes || 0)} м
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Рандом</Text>
                <Text size="sm" fw={600}>
                  {levelRangeForm.randomMode === "PLUS" ? "+" : "±"}{" "}
                  {Number(levelRangeForm.randomMinutes || 0)} м
                </Text>
              </Group>
            </Stack>
          </Paper>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setLevelRangeConfirmOpened(false)} disabled={applyingLevelRange}>
              Отмена
            </Button>
            <Button loading={applyingLevelRange} onClick={confirmApplyLevelRange}>Применить</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <Stack gap="lg">

        {/* Header */}
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Настройки</Title>
            <Text c="dimmed" size="sm">{currentSection.description}</Text>
          </div>
          <Group gap="sm">
            <Button variant="default" onClick={() => loadSettings(true)}>Обновить</Button>
            <Button onClick={saveSettings} loading={saving}>Сохранить настройки</Button>
          </Group>
        </Group>

        {/* Body: sidebar + content */}
        <Group align="flex-start" gap="xl" wrap="nowrap">

          {/* Sidebar */}
          <Box w={200} style={{ flexShrink: 0 }}>
            <Stack gap={2}>
              <Text size="xs" fw={500} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.07em" }} px="xs" mb={4}>
                Настройки
              </Text>
              {SECTIONS.slice(0, 3).map((s) => (
                <NavLink
                  key={s.key}
                  label={s.label}
                  leftSection={s.icon}
                  active={activeSection === s.key}
                  onClick={() => setActiveSection(s.key)}
                  style={{ borderRadius: "var(--mantine-radius-md)" }}
                />
              ))}

              <Divider my="xs" />

              <Text size="xs" fw={500} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.07em" }} px="xs" mb={4}>
                Игровые
              </Text>
              {SECTIONS.slice(3).map((s) => (
                <NavLink
                  key={s.key}
                  label={s.label}
                  leftSection={s.icon}
                  active={activeSection === s.key}
                  onClick={() => setActiveSection(s.key)}
                  style={{ borderRadius: "var(--mantine-radius-md)" }}
                />
              ))}
            </Stack>
          </Box>

          {/* Content */}
          <Box style={{ flex: 1, minWidth: 0 }}>

            {/* ── GENERAL ───────────────────────────────────────────────────── */}
            {activeSection === "general" && (
              <Stack gap="md">
                <Card withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Часовой пояс</Title>
                      <Text size="sm" c="dimmed">Настройка отображения времени на сайте</Text>
                    </div>

                    <Select
                      label="Режим отображения времени"
                      value={timezoneMode}
                      onChange={(value) => value && setTimezoneMode(value as TimezoneMode)}
                      w={340}
                      data={[
                        { value: "AUTO", label: "По умолчанию" },
                        { value: "MANUAL", label: "Задать часовой пояс" },
                      ]}
                    />

                    <Paper withBorder radius="md" p="md">
                      <Text size="sm">
                        {timezoneMode === "AUTO"
                          ? "Время отображается автоматически по часовому поясу вашего устройства и браузера."
                          : "Время будет отображаться в выбранном часовом поясе независимо от настроек устройства."}
                      </Text>
                    </Paper>

                    {timezoneMode === "MANUAL" && (
                      <Select
                        label="Часовой пояс"
                        value={timezone}
                        onChange={(value) => value && setTimezone(value)}
                        w={340}
                        data={[
                          { value: "Europe/Kyiv",      label: "Europe/Kyiv" },
                          { value: "Europe/Bucharest", label: "Europe/Bucharest" },
                          { value: "Europe/Warsaw",    label: "Europe/Warsaw" },
                          { value: "UTC",              label: "UTC" },
                        ]}
                      />
                    )}
                  </Stack>
                </Card>
              </Stack>
            )}

            {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <Stack gap="md">
                <Card withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Звуковые уведомления</Title>
                      <Text size="sm" c="dimmed">
                        Настройка звуковых уведомлений для событий респавна
                      </Text>
                    </div>

                    <Stack gap={0}>
                      {/* Row 1 — random window start */}
                      <Group
                        align="center"
                        gap="md"
                        py="sm"
                      >
                        <Switch
                          checked={
                            soundNotificationMode === "RANDOM_WINDOW_START" ||
                            soundNotificationMode === "BOTH"
                          }
                          onChange={(e) => {
                            const windowStart = e.currentTarget.checked;
                            const windowEnd =
                              soundNotificationMode === "RESPAWN_WINDOW_END" ||
                              soundNotificationMode === "BOTH";
                            if (windowStart && windowEnd) setSoundNotificationMode("BOTH");
                            else if (windowStart)          setSoundNotificationMode("RANDOM_WINDOW_START");
                            else if (windowEnd)            setSoundNotificationMode("RESPAWN_WINDOW_END");
                            else                           setSoundNotificationMode("NONE");
                          }}
                        />
                        <div>
                          <Text size="sm" fw={500}>Начало окна случайного респавна</Text>
                          <Text size="xs" c="dimmed">Звук, когда РБ входит в окно рандом-респа</Text>
                        </div>
                      </Group>

                      {/* Row 2 — respawn window end */}
                      <Group
                        align="center"
                        gap="md"
                        py="sm"
                      >
                        <Switch
                          checked={
                            soundNotificationMode === "RESPAWN_WINDOW_END" ||
                            soundNotificationMode === "BOTH"
                          }
                          onChange={(e) => {
                            const windowEnd = e.currentTarget.checked;
                            const windowStart =
                              soundNotificationMode === "RANDOM_WINDOW_START" ||
                              soundNotificationMode === "BOTH";
                            if (windowStart && windowEnd)  setSoundNotificationMode("BOTH");
                            else if (windowEnd)            setSoundNotificationMode("RESPAWN_WINDOW_END");
                            else if (windowStart)          setSoundNotificationMode("RANDOM_WINDOW_START");
                            else                           setSoundNotificationMode("NONE");
                          }}
                        />
                        <div>
                          <Text size="sm" fw={500}>Конец окна респавна</Text>
                          <Text size="xs" c="dimmed">Звук, когда респавн РБ окончен</Text>
                        </div>
                      </Group>
                    </Stack>

                    <Group>
                      <Button variant="default" onClick={playNotificationSound}>
                        Проверить звук
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            )}

            {/* ── ACCOUNTS ──────────────────────────────────────────────────── */}
            {activeSection === "accounts" && (
              <Stack gap="md">
                <Card withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Функция аккаунтов</Title>
                      <Text size="sm" c="dimmed">
                        Если включено, на странице мониторинга появится кнопка «Аккаунт» для каждого босса
                      </Text>
                    </div>

                    <Switch
                      checked={accountsEnabled}
                      onChange={(e) => setAccountsEnabled(e.currentTarget.checked)}
                      label={accountsEnabled ? "Функция аккаунтов включена" : "Функция аккаунтов выключена"}
                    />
                  </Stack>
                </Card>
              </Stack>
            )}

            {/* ── RESPAWN TEMPLATES ─────────────────────────────────────────── */}
            {activeSection === "respawn" && (
              <Stack gap="md">
                {/* By type */}
                <Card withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Шаблоны по типу босса</Title>
                      <Text size="sm" c="dimmed">
                        Изменения можно сохранить глобально или сразу применить к боссам выбранного типа
                      </Text>
                    </div>

                    {bossTypeSettings.length === 0 ? (
                      <Alert variant="light" color="gray" title="Нет данных">
                        Настройки по типам пока не найдены
                      </Alert>
                    ) : (
                      <Stack gap={0}>
                        {bossTypeSettings.map((item, index) => {
                          const isLast = index === bossTypeSettings.length - 1;
                          return (
                            <Box
                              key={item.bossType}
                              py="sm"
                              style={{
                                borderBottom: isLast ? "none" : "0.5px solid var(--mantine-color-default-border)",
                              }}
                            >
                              <Group align="flex-end" gap="sm" wrap="wrap">
                                <Box style={{ width: 110, flexShrink: 0, alignSelf: "flex-end", paddingBottom: 6 }}>
                                  <Badge
                                    color={getBossTypeColor(item.bossType)}
                                    variant="light"
                                    styles={{ label: { opacity: 1 } }}
                                    fullWidth
                                  >
                                    {formatBossType(item.bossType)}
                                  </Badge>
                                </Box>
                                <NumberInput
                                  label="Часы"
                                  min={0}
                                  placeholder="0"
                                  onChange={(v) => updateBaseHours(item.bossType, v)}
                                  w={90}
                                />
                                <NumberInput
                                  label="Минуты"
                                  min={0}
                                  max={59}
                                  placeholder="0"
                                  onChange={(v) => updateBaseMinutes(item.bossType, v)}
                                  w={90}
                                />
                                <NumberInput
                                  label="Рандом (м)"
                                  min={0}
                                  placeholder="0"
                                  onChange={(v) => updateRandomMinutes(item.bossType, v)}
                                  w={110}
                                />
                                <Select
                                  label="Режим"
                                  value={item.respawnRandomMode}
                                  onChange={(v) => v && updateRandomMode(item.bossType, v)}
                                  w={90}
                                  data={[
                                    { value: "PLUS",       label: "+" },
                                    { value: "PLUS_MINUS", label: "±" },
                                  ]}
                                />
                                <Button
                                  variant="light"
                                  size="sm"
                                  style={{ alignSelf: "flex-end" }}
                                  loading={applyingType === item.bossType}
                                  onClick={() => requestApplyType(item)}
                                >
                                  Применить ко всем
                                </Button>
                              </Group>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                </Card>

                {/* By level range */}
                <Card withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Применить по диапазону уровней</Title>
                      <Text size="sm" c="dimmed">
                        Задать одинаковый респавн для всех боссов в заданном диапазоне уровней
                      </Text>
                    </div>

                    <Group gap="sm" align="flex-end" wrap="wrap">
                      <NumberInput
                        label="Уровень от"
                        min={1}
                        placeholder="0"
                        value={levelRangeForm.levelMin === "" ? undefined : Number(levelRangeForm.levelMin)}
                        onChange={(v) => setLevelRangeForm((p) => ({ ...p, levelMin: String(v) }))}
                        w={110}
                      />
                      <NumberInput
                        label="Уровень до"
                        min={1}
                        placeholder="0"
                        value={levelRangeForm.levelMax === "" ? undefined : Number(levelRangeForm.levelMax)}
                        onChange={(v) => setLevelRangeForm((p) => ({ ...p, levelMax: String(v) }))}
                        w={110}
                      />
                      <NumberInput
                        label="Базовый (ч)"
                        min={0}
                        placeholder="0"
                        value={levelRangeForm.baseHours === "" ? undefined : Number(levelRangeForm.baseHours)}
                        onChange={(v) => setLevelRangeForm((p) => ({ ...p, baseHours: String(v) }))}
                        w={110}
                      />
                      <NumberInput
                        label="Базовый (м)"
                        min={0}
                        max={59}
                        placeholder="0"
                        value={levelRangeForm.baseMinutes === "" ? undefined : Number(levelRangeForm.baseMinutes)}
                        onChange={(v) => setLevelRangeForm((p) => ({ ...p, baseMinutes: String(v) }))}
                        w={110}
                      />
                      <NumberInput
                        label="Рандом (м)"
                        min={0}
                        placeholder="0"
                        value={levelRangeForm.randomMinutes === "" ? undefined : Number(levelRangeForm.randomMinutes)}
                        onChange={(v) => setLevelRangeForm((p) => ({ ...p, randomMinutes: String(v) }))}
                        w={110}
                      />
                      <Select
                        label="Режим"
                        value={levelRangeForm.randomMode}
                        onChange={(v) => v && setLevelRangeForm((p) => ({ ...p, randomMode: v as RespawnRandomMode }))}
                        w={90}
                        data={[
                          { value: "PLUS",       label: "+" },
                          { value: "PLUS_MINUS", label: "±" },
                        ]}
                      />
                      <Button variant="light" onClick={requestApplyLevelRange}>
                        Применить
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            )}

            {/* ── SCANNER ───────────────────────────────────────────────────── */}
            {activeSection === "scanner" && (
              <Stack gap="md">
                <Card withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Сканер ADR</Title>
                      <Text size="sm" c="dimmed">
                        Статус подключения внешнего сканера
                      </Text>
                    </div>

                    <Group gap="xs" align="center">
                      <Box
                        w={10}
                        h={10}
                        style={{
                          borderRadius: "50%",
                          background: scannerOnline ? "#2f9e44" : "#e03131",
                          boxShadow: scannerOnline ? "0 0 6px #2f9e44" : undefined,
                          flexShrink: 0,
                        }}
                      />
                      <Text size="sm" fw={500}>
                        {scannerOnline ? "Сканер онлайн" : "Сканер офлайн"}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            )}

          </Box>
        </Group>
      </Stack>
    </Container>
  );
}
