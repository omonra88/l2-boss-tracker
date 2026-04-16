"use client";

import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from "@mantine/core";

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
  };
  bossTypeSettings: BossTypeSetting[];
};

function formatBossType(type: BossType) {
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

function splitMinutes(totalMinutes: number) {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

function getBossTypeColor(type: BossType) {
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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingType, setApplyingType] = useState<BossType | null>(null);

  const [timezone, setTimezone] = useState("Europe/Kyiv");
  const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>("AUTO");

  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [soundNotificationMode, setSoundNotificationMode] =
    useState<SoundNotificationMode>("NONE");
  const [bossTypeSettings, setBossTypeSettings] = useState<BossTypeSetting[]>(
    []
  );

  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [selectedApplySetting, setSelectedApplySetting] =
    useState<BossTypeSetting | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

   function playNotificationSound() {
    try {
      const audio = new Audio("/sounds/notify.mp3");
      audio.volume = 1;
      void audio.play().catch((error) => {
        console.error("Не удалось воспроизвести звук", error);
        notifications.show({
          title: "Ошибка",
          message:
            "Не удалось воспроизвести звук.",
          color: "red",
        });
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось инициализировать звук",
        color: "red",
      });
    }
  }

  async function loadSettings(showRefreshToast = false) {
    try {
      const res = await fetch("/api/settings", {
        cache: "no-store",
      });

      const data: SettingsResponse | { error?: string } = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message:
            (data as { error?: string }).error || "Ошибка загрузки настроек",
          color: "red",
        });
        return;
      }

      const typedData = data as SettingsResponse;

      setTimezoneMode(typedData.settings.timezoneMode ?? "AUTO");
setTimezone(typedData.settings.timezone);
setAccountsEnabled(Boolean(typedData.settings.showScoutCredentials));
setSoundNotificationMode(
  typedData.settings.soundNotificationMode ?? "NONE"
);
      setBossTypeSettings(typedData.bossTypeSettings);

      if (showRefreshToast) {
        notifications.show({
          title: "Обновлено",
          message: "Настройки обновлены",
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

  function updateRandomMinutes(bossType: BossType, value: string | number) {
    const randomMinutes =
      typeof value === "number" ? value : Number(value || 0);

    setBossTypeSettings((prev) =>
      prev.map((item) =>
        item.bossType === bossType
          ? {
              ...item,
              respawnRandomMinutes: Number.isFinite(randomMinutes)
                ? randomMinutes
                : 0,
            }
          : item
      )
    );
  }

  function updateRandomMode(bossType: BossType, value: RespawnRandomMode) {
    setBossTypeSettings((prev) =>
      prev.map((item) =>
        item.bossType === bossType
          ? {
              ...item,
              respawnRandomMode: value,
            }
          : item
      )
    );
  }

  function updateBaseHours(bossType: BossType, value: string | number) {
    const hours = typeof value === "number" ? value : Number(value || 0);

    setBossTypeSettings((prev) =>
      prev.map((item) => {
        if (item.bossType !== bossType) return item;

        const minutes = item.respawnBaseMinutes % 60;

        return {
          ...item,
          respawnBaseMinutes:
            (Number.isFinite(hours) ? hours : 0) * 60 + minutes,
        };
      })
    );
  }

  function updateBaseMinutes(bossType: BossType, value: string | number) {
    const minutes = typeof value === "number" ? value : Number(value || 0);

    setBossTypeSettings((prev) =>
      prev.map((item) => {
        if (item.bossType !== bossType) return item;

        const hours = Math.floor(item.respawnBaseMinutes / 60);

        return {
          ...item,
          respawnBaseMinutes:
            hours * 60 + (Number.isFinite(minutes) ? minutes : 0),
        };
      })
    );
  }

  function validateSetting(item: BossTypeSetting) {
    if (
      !Number.isFinite(item.respawnBaseMinutes) ||
      item.respawnBaseMinutes <= 0
    ) {
      notifications.show({
        title: "Проверь данные",
        message: `Некорректный базовый респавн для типа ${formatBossType(
          item.bossType
        )}`,
        color: "yellow",
      });
      return false;
    }

    if (
      !Number.isFinite(item.respawnRandomMinutes) ||
      item.respawnRandomMinutes < 0
    ) {
      notifications.show({
        title: "Проверь данные",
        message: `Некорректный рандом для типа ${formatBossType(item.bossType)}`,
        color: "yellow",
      });
      return false;
    }

    return true;
  }

  async function saveSettings() {
    for (const item of bossTypeSettings) {
      if (!validateSetting(item)) {
        return;
      }
    }

    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка при сохранении настроек",
          color: "red",
        });
        return;
      }

      setTimezoneMode(data.settings.timezoneMode ?? "AUTO");
setTimezone(data.settings.timezone);
setAccountsEnabled(Boolean(data.settings.showScoutCredentials));
setSoundNotificationMode(
  data.settings.soundNotificationMode ?? "NONE"
);
setBossTypeSettings(data.bossTypeSettings);

      notifications.show({
        title: "Успешно",
        message: "Настройки сохранены",
        color: "green",
      });

      await loadSettings(false);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }

  function requestApplyType(setting: BossTypeSetting) {
    if (!validateSetting(setting)) {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bossType: setting.bossType,
          respawnBaseMinutes: setting.respawnBaseMinutes,
          respawnRandomMinutes: setting.respawnRandomMinutes,
          respawnRandomMode: setting.respawnRandomMode,
        }),
      });

      const text = await res.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non-JSON response from /api/settings/apply-type:", text);
        notifications.show({
          title: "Ошибка",
          message: "Сервер вернул не JSON. Проверь route /api/settings/apply-type",
          color: "red",
        });
        return;
      }

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка при применении шаблона",
          color: "red",
        });
        return;
      }

      setConfirmModalOpened(false);
      setSelectedApplySetting(null);

      notifications.show({
        title: "Шаблон применён",
        message: `Обновлено боссов: ${data.updatedCount}`,
        color: "green",
      });

      await loadSettings(false);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setApplyingType(null);
    }
  }

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Paper withBorder radius="md" p="lg">
          <Group>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Загрузка настроек...
            </Text>
          </Group>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Настройки</Title>
            <Text c="dimmed" size="sm">
              Общие параметры и шаблоны респауна по типам рейд-боссов
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="default"
              onClick={() => {
                loadSettings(true);
              }}
            >
              Обновить
            </Button>

            <Button onClick={saveSettings} loading={saving}>
              Сохранить настройки
            </Button>
          </Group>
        </Group>

        <Modal
          opened={confirmModalOpened}
          onClose={() => {
            if (applyingType) return;
            setConfirmModalOpened(false);
            setSelectedApplySetting(null);
          }}
          title={<Title order={4}>Подтверждение применения шаблона</Title>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Применить текущий шаблон{" "}
              <Text span fw={700}>
                "
                {selectedApplySetting
                  ? formatBossType(selectedApplySetting.bossType)
                  : ""}
                "
              </Text>{" "}
              ко всем боссам этого типа?
            </Text>

            {selectedApplySetting && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Тип
                    </Text>
                    <Badge
                      color={getBossTypeColor(selectedApplySetting.bossType)}
                      variant="light"
                    >
                      {formatBossType(selectedApplySetting.bossType)}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Базовый респавн
                    </Text>
                    <Text size="sm">
                      {
                        splitMinutes(selectedApplySetting.respawnBaseMinutes)
                          .hours
                      }{" "}
                      ч{" "}
                      {
                        splitMinutes(selectedApplySetting.respawnBaseMinutes)
                          .minutes
                      }{" "}
                      м
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Рандом
                    </Text>
                    <Text size="sm">
                      {selectedApplySetting.respawnRandomMode === "PLUS"
                        ? "+"
                        : "±"}{" "}
                      {selectedApplySetting.respawnRandomMinutes} м
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setConfirmModalOpened(false);
                  setSelectedApplySetting(null);
                }}
                disabled={Boolean(applyingType)}
              >
                Отмена
              </Button>

              <Button onClick={confirmApplyType} loading={Boolean(applyingType)}>
                Применить
              </Button>
            </Group>
          </Stack>
        </Modal>
        <Card withBorder radius="md" p="lg">
  <Stack gap="md">
    <div>
      <Title order={4}>Часовой пояс</Title>
      <Text size="sm" c="dimmed">
        Настройка отображения времени на сайте
      </Text>
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
          : "Время будет отображаться в выбранном часовом поясе независимо от настроек вашего устройства."}
      </Text>
    </Paper>

    {timezoneMode === "MANUAL" && (
      <Select
        label="Часовой пояс"
        value={timezone}
        onChange={(value) => value && setTimezone(value)}
        w={340}
        data={[
          { value: "Europe/Kyiv", label: "Europe/Kyiv" },
          { value: "Europe/Bucharest", label: "Europe/Bucharest" },
          { value: "Europe/Warsaw", label: "Europe/Warsaw" },
          { value: "UTC", label: "UTC" },
        ]}
      />
    )}
  </Stack>
</Card>

        
                <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <div>
              <Title order={4}>Уведомления</Title>
              <Text size="sm" c="dimmed">
                Настройка звуковых уведомлений для событий респауна
              </Text>
            </div>

            <Select
              label="Звуковое уведомление"
              value={soundNotificationMode}
              onChange={(value) =>
                value && setSoundNotificationMode(value as SoundNotificationMode)
              }
              w={420}
              data={[
                { value: "NONE", label: "Выключено" },
                {
                  value: "RANDOM_WINDOW_START",
                  label: "Когда РБ входит в окно рандом-респа",
                },
                {
                  value: "RESPAWN_WINDOW_END",
                  label:
                    "Когда респ РБ окончен",
                },
                { value: "BOTH", label: "Оба события" },
              ]}
            />

            <Group>
              <Button variant="default" onClick={playNotificationSound}>
                Проверить звук
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <div>
              <Title order={4}>Функция аккаунтов</Title>
              <Text size="sm" c="dimmed">
                Если включено, на странице мониторинга появится кнопка «Аккаунт»
                для каждого босса
              </Text>
            </div>

            <Switch
              checked={accountsEnabled}
              onChange={(event) =>
                setAccountsEnabled(event.currentTarget.checked)
              }
              label={
                accountsEnabled
                  ? "Функция аккаунтов включена"
                  : "Функция аккаунтов выключена"
              }
            />
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <div>
              <Title order={4}>Шаблоны респауна по типам</Title>
              <Text size="sm" c="dimmed">
                Изменения можно сохранить глобально или сразу применить к боссам
                выбранного типа
              </Text>
            </div>

            {bossTypeSettings.length === 0 ? (
              <Alert variant="light" color="gray" title="Нет данных">
                Настройки по типам пока не найдены
              </Alert>
            ) : (
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                verticalSpacing="sm"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Тип</Table.Th>
                    <Table.Th>Часы</Table.Th>
                    <Table.Th>Минуты</Table.Th>
                    <Table.Th>Рандом (м)</Table.Th>
                    <Table.Th>Режим</Table.Th>
                    <Table.Th>Действие</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {bossTypeSettings.map((item) => {
                    const base = splitMinutes(item.respawnBaseMinutes);

                    return (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text fw={600}>{formatBossType(item.bossType)}</Text>
                            <Badge
                              color={getBossTypeColor(item.bossType)}
                              variant="light"
                              w="fit-content"
                            >
                              {item.bossType}
                            </Badge>
                          </Stack>
                        </Table.Td>

                        <Table.Td>
                          <NumberInput
                            min={0}
                            value={base.hours}
                            onChange={(value) =>
                              updateBaseHours(item.bossType, value)
                            }
                            w={110}
                          />
                        </Table.Td>

                        <Table.Td>
                          <NumberInput
                            min={0}
                            max={59}
                            value={base.minutes}
                            onChange={(value) =>
                              updateBaseMinutes(item.bossType, value)
                            }
                            w={110}
                          />
                        </Table.Td>

                        <Table.Td>
                          <NumberInput
                            min={0}
                            value={item.respawnRandomMinutes}
                            onChange={(value) =>
                              updateRandomMinutes(item.bossType, value)
                            }
                            w={130}
                          />
                        </Table.Td>

                        <Table.Td>
                          <Select
                            value={item.respawnRandomMode}
                            onChange={(value) =>
                              value &&
                              updateRandomMode(
                                item.bossType,
                                value as RespawnRandomMode
                              )
                            }
                            w={110}
                            data={[
                              { value: "PLUS", label: "+" },
                              { value: "PLUS_MINUS", label: "±" },
                            ]}
                          />
                        </Table.Td>

                        <Table.Td>
                          <Button
                            type="button"
                            size="sm"
                            variant="light"
                            onClick={() => requestApplyType(item)}
                            loading={applyingType === item.bossType}
                          >
                            Применить
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}