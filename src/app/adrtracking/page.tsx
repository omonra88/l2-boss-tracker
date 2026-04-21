"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { formatDateInTimeZone } from "@/lib/date-utils";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
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
  IconEraser,
  IconInfoCircle,
  IconKey,
  IconSword,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";

type RespawnStatus = "waiting" | "window" | "expired" | "unknown";

type SoundNotificationMode =
  | "NONE"
  | "RANDOM_WINDOW_START"
  | "RESPAWN_WINDOW_END"
  | "BOTH";

type TrackedBossItem = {
  id: number;
  lastKillAt: string | null;
  adrState?: "RESPAWNED" | "WAITING";
  hasBaseBoss?: boolean;
  hasRespawn?: boolean;
  boss: {
    id: number;
    name: string;
    level: number;
    bossType: "NORMAL" | "QUEST" | "EPIC" | "UNIQUE";
    location: string | null;
    respawnBaseMinutes: number;
    respawnRandomMinutes: number;
    respawnRandomMode: "PLUS" | "PLUS_MINUS";
  };
  respawn?: {
    respawnStart: string | null;
    respawnEnd: string | null;
    status: RespawnStatus;
    countdown?: string | null;
  } | null;
};

type TrackingSort =
  | "status"
  | "name_asc"
  | "name_desc"
  | "level_asc"
  | "level_desc"
  | "timer_asc"
  | "timer_desc";

type BossAccount = {
  id: number;
  bossId: number;
  characterName: string;
  login: string;
  password: string;
};

type BossAccountForm = {
  characterName: string;
  login: string;
  password: string;
};

const initialAccountForm: BossAccountForm = {
  characterName: "",
  login: "",
  password: "",
};

function formatBossType(type: TrackedBossItem["boss"]["bossType"]) {
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

function getBossTypeColor(type: TrackedBossItem["boss"]["bossType"]) {
  switch (type) {
    case "EPIC":
      return "red";
    case "UNIQUE":
      return "yellow";
    case "QUEST":
      return "blue";
    case "NORMAL":
    default:
      return "green";
  }
}

function getAdrStatusLabel(item: TrackedBossItem) {
  if (item.adrState === "RESPAWNED") {
    return "РБ РЕСНУЛСЯ";
  }

  return null;
}

function getAdrStatusColor(item: TrackedBossItem) {
  if (item.adrState === "RESPAWNED") {
    return "green";
  }

  return null;
}

function getAdrCountdown(item: TrackedBossItem) {
  if (item.adrState === "RESPAWNED") {
    return "LIVE";
  }

  return null;
}

function getAdrLinkIndicator(item: TrackedBossItem) {
  if (!item.hasBaseBoss) {
    return {
      color: "red" as const,
      tooltip:
        "Босс не добавлен в основной список. Нажми, чтобы перейти и исправить это.",
      href: `/?openAddBoss=1&bossName=${encodeURIComponent(item.boss.name)}`,
    };
  }

  if (!item.hasRespawn) {
    return {
      color: "yellow" as const,
      tooltip:
      "У босса не настроен респавн. Нажми, чтобы открыть редактирование и исправить это.",
    href: `/?openEditBoss=1&bossId=${item.boss.id}`,
    };
  }

  return {
    color: "green" as const,
    tooltip: "Босс найден в основной базе и респавн настроен. Нажми, чтобы открыть список боссов.",
    href: "/",
  };
}

function getLiveStatus(respawn?: TrackedBossItem["respawn"]) {
  if (!respawn?.respawnStart || !respawn?.respawnEnd) {
    return "unknown" as RespawnStatus;
  }

  const now = Date.now();
  const start = new Date(respawn.respawnStart).getTime();
  const end = new Date(respawn.respawnEnd).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "unknown" as RespawnStatus;
  }

  if (now < start) return "waiting";
  if (now >= start && now <= end) return "window";
  return "expired";
}

function getStatusLabel(status: RespawnStatus) {
  switch (status) {
    case "waiting":
      return "Мёртв";
    case "window":
      return "В окне респа";
    case "expired":
      return "Окно прошло";
    default:
      return "Не отмечен";
  }
}

function getStatusColor(status: RespawnStatus) {
  switch (status) {
    case "waiting":
      return "red";
    case "window":
      return "orange";
    case "expired":
      return "green";
    default:
      return "gray";
  }
}

function formatCountdownTo(targetDate: string | null) {
  if (!targetDate) return "—";

  const targetMs = new Date(targetDate).getTime();
  if (Number.isNaN(targetMs)) return "—";

  const diffMs = targetMs - Date.now();

  if (diffMs <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getLiveCountdown(respawn?: TrackedBossItem["respawn"]) {
  const status = getLiveStatus(respawn);

  if (status === "waiting" || status === "window") {
    return formatCountdownTo(respawn?.respawnEnd ?? null);
  }

  if (status === "expired") {
    return "00:00:00";
  }

  return "—";
}

function getCountdownColor(status: RespawnStatus) {
  switch (status) {
    case "waiting":
      return "#8a0000";
    case "window":
      return "#886402";
    case "expired":
      return "#2b6a3f";
    default:
      return "#495057";
  }
}

function getCountdownBackground(status: RespawnStatus) {
  switch (status) {
    case "waiting":
      return "#f8d2d2";
    case "window":
      return "#ffe5bf";
    case "expired":
      return "#dcfad2";
    default:
      return "#f1f3f5";
  }
}

function getCountdownBorder(status: RespawnStatus) {
  switch (status) {
    case "waiting":
      return "#f08c00";
    case "window":
      return "#40c057";
    case "expired":
      return "#fa5252";
    default:
      return "#ced4da";
  }
}

function getStatusOrder(status: RespawnStatus) {
  const order: Record<RespawnStatus, number> = {
    window: 1,
    waiting: 2,
    expired: 3,
    unknown: 4,
  };

  return order[status];
}

function formatCompactDateTime(value: string | null, timezone: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const formatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "--";
  const month = parts.find((part) => part.type === "month")?.value ?? "--";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";

  return `${day}.${month} | ${hour}:${minute}`;
}

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const second = Number(parts.find((part) => part.type === "second")?.value ?? 0);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  return asUtc - date.getTime();
}

function formatDateTimeLocalInTimeZone(value: string | null, timeZone: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseDateTimeLocalInTimeZone(value: string, timeZone: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  const firstOffset = getTimeZoneOffsetMs(timeZone, new Date(utcGuess));
  const firstPass = utcGuess - firstOffset;

  const secondOffset = getTimeZoneOffsetMs(timeZone, new Date(firstPass));
  const finalTs = utcGuess - secondOffset;

  const result = new Date(finalTs);

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result;
}

function getTimeForSort(item: TrackedBossItem) {
  const status = getLiveStatus(item.respawn);

  if (status === "waiting" || status === "window" || status === "expired") {
    return new Date(item.respawn?.respawnEnd ?? 0).getTime();
  }

  return Number.MAX_SAFE_INTEGER;
}

function shouldPlayForRandomWindowStart(mode: SoundNotificationMode) {
  return mode === "RANDOM_WINDOW_START" || mode === "BOTH";
}

function shouldPlayForRespawnWindowEnd(mode: SoundNotificationMode) {
  return mode === "RESPAWN_WINDOW_END" || mode === "BOTH";
}

export default function TrackingPage() {
  const [tracked, setTracked] = useState<TrackedBossItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [timezone, setTimezone] = useState("Europe/Kyiv");
  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [soundNotificationMode, setSoundNotificationMode] =
    useState<SoundNotificationMode>("NONE");

  const previousStatusesRef = useRef<Record<number, RespawnStatus>>({});
  const initializedStatusesRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundUnlockedRef = useRef(false);
  const soundBlockToastShownRef = useRef(false);

  // ── filter state: читаем из localStorage при инициализации,
  //    пишем только по кнопке "Сохранить фильтры" ─────────────
  function readLS<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch { /* ignore */ }
    return fallback;
  }

  const [filtersOpened, setFiltersOpened] = useState<boolean>(false);
  const [nameFilter, setNameFilter] = useState<string>("");

  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TrackedBossItem | null>(null);

  const [editKillModalOpened, setEditKillModalOpened] = useState(false);
  const [editingKill, setEditingKill] = useState(false);
  const [itemToEditKill, setItemToEditKill] = useState<TrackedBossItem | null>(null);
  const [editKillValue, setEditKillValue] = useState("");

  const [clearingOne, setClearingOne] = useState(false);
  const [clearOneModalOpened, setClearOneModalOpened] = useState(false);
  const [itemToClear, setItemToClear] = useState<TrackedBossItem | null>(null);

  const [clearingAll, setClearingAll] = useState(false);
  const [clearAllModalOpened, setClearAllModalOpened] = useState(false);

  const [accountModalOpened, setAccountModalOpened] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [selectedBossForAccount, setSelectedBossForAccount] =
    useState<TrackedBossItem["boss"] | null>(null);
  const [accountForm, setAccountForm] =
    useState<BossAccountForm>(initialAccountForm);
  const [existingAccount, setExistingAccount] = useState<BossAccount | null>(
    null
  );

  const [typeFilter, setTypeFilter] = useState<"ALL" | TrackedBossItem["boss"]["bossType"]>(() => readLS("adrtracking:typeFilter", "ALL"));
  const [statusFilter, setStatusFilter] = useState<"ALL" | RespawnStatus>(() => readLS("adrtracking:statusFilter", "ALL"));
  const [levelMinFilter, setLevelMinFilter] = useState<string>(() => readLS("adrtracking:levelMinFilter", ""));
  const [levelMaxFilter, setLevelMaxFilter] = useState<string>(() => readLS("adrtracking:levelMaxFilter", ""));
  const [sortBy, setSortBy] = useState<TrackingSort>(() => readLS("adrtracking:sortBy", "status"));

  function saveFilters() {
    try {
      localStorage.setItem("adrtracking:typeFilter", JSON.stringify(typeFilter));
      localStorage.setItem("adrtracking:statusFilter", JSON.stringify(statusFilter));
      localStorage.setItem("adrtracking:levelMinFilter", JSON.stringify(levelMinFilter));
      localStorage.setItem("adrtracking:levelMaxFilter", JSON.stringify(levelMaxFilter));
      localStorage.setItem("adrtracking:sortBy", JSON.stringify(sortBy));
    } catch { /* ignore */ }
  }

  function ensureAudioObject() {
    if (typeof window === "undefined") return null;

    if (!audioRef.current) {
      const audio = new Audio("/sounds/notify.mp3");
      audio.preload = "auto";
      audio.volume = 1;
      audioRef.current = audio;
    }

    return audioRef.current;
  }

  async function unlockSound() {
    const audio = ensureAudioObject();
    if (!audio) return false;

    try {
      audio.muted = true;
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      soundUnlockedRef.current = true;
      return true;
    } catch (error) {
      console.error("Не удалось разблокировать звук", error);
      audio.muted = false;
      return false;
    }
  }

  async function playNotificationSound(showErrorToast = false) {
    const audio = ensureAudioObject();
    if (!audio) return false;

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch (error) {
      console.error("Не удалось воспроизвести звук", error);

      if (showErrorToast || !soundBlockToastShownRef.current) {
        notifications.show({
          title: "Звук заблокирован",
          message:
            "Кликни по странице или нажми «Проверить звук», чтобы браузер разрешил воспроизведение.",
          color: "yellow",
        });
        soundBlockToastShownRef.current = true;
      }

      return false;
    }
  }

  async function testNotificationSound() {
    await unlockSound();
    const played = await playNotificationSound(true);

    if (played) {
      notifications.show({
        title: "Тест звука",
        message: "Звуковое уведомление воспроизведено",
        color: "green",
      });
    }
  }

  async function loadTracked(showRefreshToast = false) {
    try {
      const res = await fetch("/api/adrtracking", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Не удалось загрузить мониторинг",
          color: "red",
        });
        return;
      }

      setTracked(Array.isArray(data) ? data : []);

      if (showRefreshToast) {
        notifications.show({
          title: "Обновлено",
          message: "Мониторинг обновлён",
          color: "green",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка при загрузке мониторинга",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }
  async function removeAdrBoss(id: number, bossName: string) {
  try {
    const res = await fetch(`/api/adrtracking/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      notifications.show({
        title: "Ошибка",
        message: data.error || "Не удалось удалить ADR босса",
        color: "red",
      });
      return;
    }

    setTracked((prev) => prev.filter((item) => item.id !== id));

    notifications.show({
      title: "Удалено",
      message: `Босс удалён из ADR списка: ${bossName}`,
      color: "green",
    });
  } catch (error) {
    console.error(error);
    notifications.show({
      title: "Ошибка",
      message: "Сетевая ошибка при удалении",
      color: "red",
    });
  }
}

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        return;
      }

      const settings = data?.settings ?? data;

      if (settings?.timezone) {
        setTimezone(settings.timezone);
      }

      setAccountsEnabled(Boolean(settings?.showScoutCredentials));
      setSoundNotificationMode(
        (settings?.soundNotificationMode as SoundNotificationMode) || "NONE"
      );
    } catch (error) {
      console.error("Ошибка загрузки настроек", error);
    }
  }

  function resetFilters() {
    setNameFilter("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setLevelMinFilter("");
    setLevelMaxFilter("");
    setSortBy("status");
  }

  useEffect(() => {
    void loadTracked(false);
    void loadSettings();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const settingsInterval = window.setInterval(() => {
      void loadSettings();
    }, 30000);

    return () => clearInterval(settingsInterval);
  }, []);

  useEffect(() => {
    const trackedInterval = window.setInterval(() => {
      void loadTracked(false);
    }, 3000);

    return () => clearInterval(trackedInterval);
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!soundUnlockedRef.current) {
        void unlockSound();
      }
    };

    window.addEventListener("pointerdown", handleFirstInteraction, {
      passive: true,
    });
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const currentStatuses: Record<number, RespawnStatus> = {};

    for (const item of tracked) {
      currentStatuses[item.id] = getLiveStatus(item.respawn);
    }

    if (!initializedStatusesRef.current) {
      previousStatusesRef.current = currentStatuses;
      initializedStatusesRef.current = true;
      return;
    }

    if (soundNotificationMode === "NONE") {
      previousStatusesRef.current = currentStatuses;
      return;
    }

    let shouldPlaySound = false;

    for (const item of tracked) {
      const previousStatus = previousStatusesRef.current[item.id];
      const currentStatus = currentStatuses[item.id];

      if (!previousStatus || previousStatus === currentStatus) {
        continue;
      }

      const enteredRandomWindow =
        previousStatus === "waiting" && currentStatus === "window";

      const respawnWindowEnded =
        previousStatus === "window" && currentStatus === "expired";

      if (
        enteredRandomWindow &&
        shouldPlayForRandomWindowStart(soundNotificationMode)
      ) {
        shouldPlaySound = true;
        break;
      }

      if (
        respawnWindowEnded &&
        shouldPlayForRespawnWindowEnd(soundNotificationMode)
      ) {
        shouldPlaySound = true;
        break;
      }
    }

    if (shouldPlaySound) {
      void playNotificationSound(false);
    }

    previousStatusesRef.current = currentStatuses;
  }, [tracked, tick, soundNotificationMode]);

  function openDeleteModal(item: TrackedBossItem) {
    setItemToDelete(item);
    setDeleteModalOpened(true);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModalOpened(false);
    setItemToDelete(null);
  }

  function openClearOneModal(item: TrackedBossItem) {
    setItemToClear(item);
    setClearOneModalOpened(true);
  }

  function closeClearOneModal() {
    if (clearingOne) return;
    setClearOneModalOpened(false);
    setItemToClear(null);
  }

  function openClearAllModal() {
    setClearAllModalOpened(true);
  }

  function closeClearAllModal() {
    if (clearingAll) return;
    setClearAllModalOpened(false);
  }

   function openEditKillModal(item: TrackedBossItem) {
    setItemToEditKill(item);
    setEditKillValue(formatDateTimeLocalInTimeZone(item.lastKillAt, timezone));
    setEditKillModalOpened(true);
  }

  function closeEditKillModal() {
    if (editingKill) return;
    setEditKillModalOpened(false);
    setItemToEditKill(null);
    setEditKillValue("");
  }

  function closeAccountModal() {
    if (accountSaving || accountDeleting) return;
    setAccountModalOpened(false);
    setSelectedBossForAccount(null);
    setExistingAccount(null);
    setAccountForm(initialAccountForm);
  }

  function updateAccountForm<K extends keyof BossAccountForm>(
    key: K,
    value: BossAccountForm[K]
  ) {
    setAccountForm((prev) => ({ ...prev, [key]: value }));
  }

  async function openAccountModal(item: TrackedBossItem) {
    setSelectedBossForAccount(item.boss);
    setAccountForm(initialAccountForm);
    setExistingAccount(null);
    setAccountModalOpened(true);
    setAccountLoading(true);

    try {
      const res = await fetch(`/api/boss-accounts/${item.boss.id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка загрузки аккаунта",
          color: "red",
        });
        return;
      }

      if (data.account) {
        setExistingAccount(data.account);
        setAccountForm({
          characterName: data.account.characterName || "",
          login: data.account.login || "",
          password: data.account.password || "",
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
      setAccountLoading(false);
    }
  }

  async function saveAccount() {
    if (!selectedBossForAccount) return;

    if (!accountForm.characterName.trim()) {
      notifications.show({
        title: "Проверь форму",
        message: "Укажи ник персонажа",
        color: "yellow",
      });
      return;
    }

    if (!accountForm.login.trim()) {
      notifications.show({
        title: "Проверь форму",
        message: "Укажи логин",
        color: "yellow",
      });
      return;
    }

    if (!accountForm.password.trim()) {
      notifications.show({
        title: "Проверь форму",
        message: "Укажи пароль",
        color: "yellow",
      });
      return;
    }

    setAccountSaving(true);

    try {
      const res = await fetch(`/api/boss-accounts/${selectedBossForAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountForm),
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка сохранения аккаунта",
          color: "red",
        });
        return;
      }

      setExistingAccount(data.account);

      notifications.show({
        title: "Аккаунт сохранён",
        message: `Данные обновлены для ${selectedBossForAccount.name}`,
        color: "green",
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setAccountSaving(false);
    }
  }

  async function deleteAccount() {
    if (!selectedBossForAccount || !existingAccount) return;

    setAccountDeleting(true);

    try {
      const res = await fetch(`/api/boss-accounts/${selectedBossForAccount.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка удаления аккаунта",
          color: "red",
        });
        return;
      }

      setExistingAccount(null);
      setAccountForm(initialAccountForm);

      notifications.show({
        title: "Аккаунт удалён",
        message: `Данные удалены для ${selectedBossForAccount.name}`,
        color: "green",
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setAccountDeleting(false);
    }
  }

  async function confirmRemoveFromTracking() {
    if (!itemToDelete) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/tracked-bosses/${itemToDelete.id}`, {
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

      setTracked((prev) => prev.filter((item) => item.id !== itemToDelete.id));

      notifications.show({
        title: "Удалено",
        message: `Босс убран из мониторинга: ${itemToDelete.boss.name}`,
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

  async function confirmClearOne() {
    if (!itemToClear) return;

    setClearingOne(true);

    try {
      const res = await fetch(`/api/tracked-bosses/${itemToClear.id}/clear`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка при очистке записи",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Очищено",
        message: `Данные сброшены: ${itemToClear.boss.name}`,
        color: "green",
      });

      closeClearOneModal();
      await loadTracked(false);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setClearingOne(false);
    }
  }

  async function confirmClearAll() {
    setClearingAll(true);

    try {
      const res = await fetch("/api/tracked-bosses/clear-all", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка при очистке мониторинга",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Мониторинг очищен",
        message: `Очищено записей: ${data.clearedCount}`,
        color: "green",
      });

      closeClearAllModal();
      await loadTracked(false);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setClearingAll(false);
    }
  }

  async function markAsKilled(id: number) {
    try {
      const res = await fetch(`/api/tracked-bosses/${id}/kill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Ошибка при сохранении убийства",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Убийство сохранено",
        message: data.boss.name,
        color: "yellow",
      });

      await loadTracked(false);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    }
  }

  async function saveManualKillTime() {
    if (!itemToEditKill) return;

    if (!editKillValue) {
      notifications.show({
        title: "Проверь форму",
        message: "Укажи дату и время убийства",
        color: "yellow",
      });
      return;
    }

    const parsedDate = parseDateTimeLocalInTimeZone(editKillValue, timezone);

    if (!parsedDate) {
      notifications.show({
        title: "Некорректная дата",
        message: "Не удалось распознать выбранные дату и время",
        color: "red",
      });
      return;
    }

    setEditingKill(true);

    try {
      const res = await fetch(`/api/tracked-bosses/${itemToEditKill.id}/kill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          killTime: parsedDate.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Ошибка",
          message: data.error || "Не удалось сохранить время убийства",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Время убийства обновлено",
        message: itemToEditKill.boss.name,
        color: "green",
      });

      closeEditKillModal();
      await loadTracked(false);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Ошибка",
        message: "Сетевая ошибка",
        color: "red",
      });
    } finally {
      setEditingKill(false);
    }
  }

  const filteredAndSortedTracked = useMemo(() => {
    const minLevel = levelMinFilter.trim() ? Number(levelMinFilter) : null;
    const maxLevel = levelMaxFilter.trim() ? Number(levelMaxFilter) : null;
    const normalizedNameFilter = nameFilter.trim().toLowerCase();


    const filtered = tracked.filter((item) => {
      const liveStatus = getLiveStatus(item.respawn);
      if (
  normalizedNameFilter &&
  !item.boss.name.toLowerCase().includes(normalizedNameFilter)
) {
  return false;
}

      if (typeFilter !== "ALL" && item.boss.bossType !== typeFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && liveStatus !== statusFilter) {
        return false;
      }

      if (
        minLevel !== null &&
        !Number.isNaN(minLevel) &&
        item.boss.level < minLevel
      ) {
        return false;
      }

      if (
        maxLevel !== null &&
        !Number.isNaN(maxLevel) &&
        item.boss.level > maxLevel
      ) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const aStatus = getLiveStatus(a.respawn);
      const bStatus = getLiveStatus(b.respawn);

      switch (sortBy) {
        case "status":
          if (getStatusOrder(aStatus) !== getStatusOrder(bStatus)) {
            return getStatusOrder(aStatus) - getStatusOrder(bStatus);
          }
          return getTimeForSort(a) - getTimeForSort(b);

        case "name_asc":
          return a.boss.name.localeCompare(b.boss.name, "ru");
        case "name_desc":
          return b.boss.name.localeCompare(a.boss.name, "ru");
        case "level_asc":
          return a.boss.level - b.boss.level;
        case "level_desc":
          return b.boss.level - a.boss.level;
        case "timer_asc":
          return getTimeForSort(a) - getTimeForSort(b);
        case "timer_desc":
          return getTimeForSort(b) - getTimeForSort(a);
        default:
          return 0;
      }
    });
  }, [
    tracked,
    nameFilter,
    typeFilter,
    statusFilter,
    levelMinFilter,
    levelMaxFilter,
    sortBy,
    tick,
  ]);

  const rows = filteredAndSortedTracked.map((item) => {
  const status = getLiveStatus(item.respawn);
  const countdown = getLiveCountdown(item.respawn);

  const adrStatusLabel = getAdrStatusLabel(item);
  const adrStatusColor = getAdrStatusColor(item);
  const adrCountdown = getAdrCountdown(item);

  const linkIndicator = getAdrLinkIndicator(item);

  const lastKillText = formatCompactDateTime(item.lastKillAt, timezone);
  const respawnStartText =
    item.adrState === "RESPAWNED"
      ? "—"
      : formatCompactDateTime(item.respawn?.respawnStart ?? null, timezone);
  const respawnEndText =
    item.adrState === "RESPAWNED"
      ? "—"
      : formatCompactDateTime(item.respawn?.respawnEnd ?? null, timezone);

  const statusLabel = adrStatusLabel ?? getStatusLabel(status);
  const statusColor = adrStatusColor ?? getStatusColor(status);
  const countdownText = adrCountdown ?? countdown;

    return (
      <Table.Tr key={item.id}>
        <Table.Td>
          <Text fw={600} size="sm">
            {item.boss.name}
          </Text>
        </Table.Td>

        <Table.Td>
          <Text ta="center" size="sm">
            {item.boss.level}
          </Text>
        </Table.Td>

        <Table.Td>
          <Badge
            size="sm"
            color={getBossTypeColor(item.boss.bossType)}
            variant="light"
            styles={{
    root: {
      fontWeight: 600,
      letterSpacing: "1px",
    },
    label: {
      opacity: 1, // 🔥 ключевой фикс
    },
  }}
          >
            {formatBossType(item.boss.bossType)}
          </Badge>
        </Table.Td>

        <Table.Td>
          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
            {lastKillText}
          </Text>
        </Table.Td>

        <Table.Td>
          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
            {respawnStartText}
          </Text>
        </Table.Td>

        <Table.Td>
          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
            {respawnEndText}
          </Text>
        </Table.Td>

        <Table.Td>
          <Badge size="sm" color={statusColor} variant="light" styles={{
    root: {
      fontWeight: 600,
      letterSpacing: "1px",
    },
    label: {
      opacity: 1, // 🔥 ключевой фикс
    },
  }}>
            {statusLabel}
          </Badge>
        </Table.Td>

        <Table.Td>
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "4px 8px",
              borderRadius: "6px",
              background: getCountdownBackground(status),
              color: getCountdownColor(status),
              //border: `1px solid ${getCountdownBorder(status)}`,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.3px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {countdownText}
          </Box>
        </Table.Td>
        <Table.Td>
  <Group gap={6} wrap="nowrap" justify="center">
    <Tooltip label={linkIndicator.tooltip} withArrow>
  <ActionIcon
    component={Link}
    href={linkIndicator.href}
    type="button"
    size="md"
    radius="sm"
    color={linkIndicator.color}
    variant="light"
    aria-label={linkIndicator.tooltip}
  >
    <IconInfoCircle size={18} />
  </ActionIcon>
</Tooltip>

    <Tooltip label="Удалить из ADR списка" withArrow>
      <ActionIcon
        type="button"
        size="md"
        radius="sm"
        color="red"
        variant="light"
        onClick={() => removeAdrBoss(item.id, item.boss.name)}
        aria-label="Удалить из ADR списка"
      >
        <IconTrash size={18} />
      </ActionIcon>
    </Tooltip>
  </Group>
</Table.Td>
        
      </Table.Tr>
    );
  });

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Мониторинг рейд-боссов</Title>
          </div>
        </Group>

         <Modal
          opened={editKillModalOpened}
          onClose={closeEditKillModal}
          title={<Title order={4}>Изменить время убийства</Title>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Укажи дату и время убийства для{" "}
              <Text span fw={700}>
                {itemToEditKill?.boss.name ?? ""}
              </Text>
              .
            </Text>

            <TextInput
              label={`Дата и время (${timezone})`}
              type="datetime-local"
              value={editKillValue}
              onChange={(e) => setEditKillValue(e.currentTarget.value)}
            />

            <Paper withBorder radius="md" p="md">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Текущее значение
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatCompactDateTime(itemToEditKill?.lastKillAt ?? null, timezone)}
                  </Text>
                </Group>

                <Text size="xs" c="dimmed">
                  После сохранения время будет пересчитано для респа и показано в таблице
                  в том же часовом поясе.
                </Text>
              </Stack>
            </Paper>

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={closeEditKillModal}
                disabled={editingKill}
              >
                Отмена
              </Button>
              <Button onClick={saveManualKillTime} loading={editingKill}>
                Сохранить
              </Button>
            </Group>
          </Stack>
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
                {itemToDelete?.boss.name ?? ""}
              </Text>{" "}
              из мониторинга?
            </Text>

            {itemToDelete && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Имя
                    </Text>
                    <Text size="sm" fw={600}>
                      {itemToDelete.boss.name}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Уровень
                    </Text>
                    <Text size="sm">{itemToDelete.boss.level}</Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Тип
                    </Text>
                    <Badge
                      color={getBossTypeColor(itemToDelete.boss.bossType)}
                      variant="light"
                    >
                      {formatBossType(itemToDelete.boss.bossType)}
                    </Badge>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Отмена
              </Button>
              <Button
                color="red"
                onClick={confirmRemoveFromTracking}
                loading={deleting}
              >
                Удалить
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={clearOneModalOpened}
          onClose={closeClearOneModal}
          title={<Title order={4}>Подтверждение очистки</Title>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Очистить данные босса{" "}
              <Text span fw={700}>
                {itemToClear?.boss.name ?? ""}
              </Text>
              ? После этого запись будет выглядеть так, как будто босс ещё не был
              убит.
            </Text>

            {itemToClear && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Имя
                    </Text>
                    <Text size="sm" fw={600}>
                      {itemToClear.boss.name}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Последний килл
                    </Text>
                    <Text size="sm">
                      {formatDateInTimeZone(itemToClear.lastKillAt, timezone)}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={closeClearOneModal}
                disabled={clearingOne}
              >
                Отмена
              </Button>
              <Button onClick={confirmClearOne} loading={clearingOne}>
                Очистить
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={clearAllModalOpened}
          onClose={closeClearAllModal}
          title={<Title order={4}>Подтверждение очистки всего мониторинга</Title>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Очистить данные по всем боссам в мониторинге? После этого все записи
              будут выглядеть так, как будто убийства ещё не отмечались.
            </Text>

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={closeClearAllModal}
                disabled={clearingAll}
              >
                Отмена
              </Button>
              <Button
                color="red"
                onClick={confirmClearAll}
                loading={clearingAll}
              >
                Очистить всё
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={accountModalOpened}
          onClose={closeAccountModal}
          title={
            <Title order={4}>
              {selectedBossForAccount
                ? `Аккаунт: ${selectedBossForAccount.name}`
                : "Аккаунт"}
            </Title>
          }
          centered
          size="lg"
        >
          {accountLoading ? (
            <Paper withBorder radius="md" p="lg">
              <Group>
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Загрузка аккаунта...
                </Text>
              </Group>
            </Paper>
          ) : (
            <Stack gap="md">
              <TextInput
                label="Ник персонажа"
                placeholder="Например, SpoilerMain"
                value={accountForm.characterName}
                onChange={(e) =>
                  updateAccountForm("characterName", e.currentTarget.value)
                }
              />

              <TextInput
                label="Логин"
                placeholder="Введите логин"
                value={accountForm.login}
                onChange={(e) => updateAccountForm("login", e.currentTarget.value)}
              />

              <TextInput
                label="Пароль"
                placeholder="Введите пароль"
                value={accountForm.password}
                onChange={(e) =>
                  updateAccountForm("password", e.currentTarget.value)
                }
              />

              <Group justify="space-between">
                <Group>
                  {existingAccount && (
                    <Button
                      color="red"
                      variant="light"
                      onClick={deleteAccount}
                      loading={accountDeleting}
                    >
                      Удалить аккаунт
                    </Button>
                  )}
                </Group>

                <Group>
                  <Button variant="default" onClick={closeAccountModal}>
                    Закрыть
                  </Button>
                  <Button onClick={saveAccount} loading={accountSaving}>
                    {existingAccount ? "Сохранить изменения" : "Создать аккаунт"}
                  </Button>
                </Group>
              </Group>
            </Stack>
          )}
        </Modal>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
  <div>
    <Title order={4}>Список отслеживания</Title>
    <Text size="sm" c="dimmed">
      Таймеры обновляются автоматически каждую секунду
    </Text>
  </div>

  <Group gap="sm" align="center">
    <TextInput
      placeholder="Поиск по имени босса"
      value={nameFilter}
      onChange={(e) => setNameFilter(e.currentTarget.value)}
      w={270}
    />

    <Button
      variant={filtersOpened ? "filled" : "default"}
      onClick={() => setFiltersOpened(!filtersOpened)}
    >
      {filtersOpened ? "Скрыть фильтры" : "Показать фильтры"}
    </Button>
    <Button variant="default" onClick={resetFilters}>
      Сбросить фильтры
    </Button>
  </Group>
</Group>

            {filtersOpened && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group grow align="end">
                    <Select
                      label="Тип"
                      value={typeFilter}
                      onChange={(value) =>
                        value &&
                        setTypeFilter(
                          value as "ALL" | TrackedBossItem["boss"]["bossType"]
                        )
                      }
                      data={[
                        { value: "ALL", label: "Все типы" },
                        { value: "NORMAL", label: "Обычный" },
                        { value: "QUEST", label: "Квестовый" },
                        { value: "EPIC", label: "Эпический" },
                        { value: "UNIQUE", label: "Уникальный" },
                      ]}
                    />

                    <Select
                      label="Статус"
                      value={statusFilter}
                      onChange={(value) =>
                        value && setStatusFilter(value as "ALL" | RespawnStatus)
                      }
                      data={[
                        { value: "ALL", label: "Все статусы" },
                        { value: "waiting", label: "Мёртв" },
                        { value: "window", label: "В окне респа" },
                        { value: "expired", label: "Окно прошло" },
                        { value: "unknown", label: "Не отмечен" },
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
                      onChange={(value) =>
                        value && setSortBy(value as TrackingSort)
                      }
                      data={[
                        { value: "status", label: "По статусу" },
                        { value: "timer_asc", label: "Таймер ↑" },
                        { value: "timer_desc", label: "Таймер ↓" },
                        { value: "level_asc", label: "LVL ↑" },
                        { value: "level_desc", label: "LVL ↓" },
                        { value: "name_asc", label: "Имя А-Я" },
                        { value: "name_desc", label: "Имя Я-А" },
                      ]}
                    />
                  </Group>

                  <Group justify="flex-end">
                    <Button variant="filled" color="blue" onClick={saveFilters}>
                      Сохранить фильтры
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
            ) : filteredAndSortedTracked.length === 0 ? (
              <Alert variant="light" color="gray" title="Ничего не найдено">
                По текущим фильтрам ничего не найдено. Измени фильтры или добавь
                босса в мониторинг.
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
                      <Table.Th style={{ width: "30%" }}>
                        <Text size="sm" fw={600}>
                          Босс
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "4%" }}>
                        <Text size="sm" fw={600}>
                          LVL
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "13%" }}>
                        <Text size="sm" fw={600}>
                          Тип
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "8%" }}>
                        <Text size="sm" fw={600}>
                          Килл
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "8%" }}>
                        <Text size="sm" fw={600}>
                          Старт
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "8%" }}>
                        <Text size="sm" fw={600}>
                          Конец
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "13%" }}>
                        <Text size="sm" fw={600}>
                          Статус
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "8%" }}>
                        <Text size="sm" fw={600}>
                          Таймер
                        </Text>
                      </Table.Th>
                      <Table.Th style={{ width: "14%" }}>
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