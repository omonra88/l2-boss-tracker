import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SOUND_NOTIFICATION_MODES = [
  "NONE",
  "RANDOM_WINDOW_START",
  "RESPAWN_WINDOW_END",
  "BOTH",
] as const;

type SoundNotificationMode = (typeof SOUND_NOTIFICATION_MODES)[number];

function isSoundNotificationMode(
  value: unknown
): value is SoundNotificationMode {
  return (
    typeof value === "string" &&
    SOUND_NOTIFICATION_MODES.includes(value as SoundNotificationMode)
  );
}

type BossType = "NORMAL" | "QUEST" | "EPIC" | "UNIQUE";
type RespawnRandomMode = "PLUS" | "PLUS_MINUS";

type BossTypeSettingInput = {
  id?: number;
  bossType: BossType;
  respawnBaseMinutes: number;
  respawnRandomMinutes: number;
  respawnRandomMode: RespawnRandomMode;
};

const defaultBossTypeSettings: BossTypeSettingInput[] = [
  {
    bossType: "NORMAL",
    respawnBaseMinutes: 24 * 60,
    respawnRandomMinutes: 0,
    respawnRandomMode: "PLUS",
  },
  {
    bossType: "QUEST",
    respawnBaseMinutes: 24 * 60,
    respawnRandomMinutes: 0,
    respawnRandomMode: "PLUS",
  },
  {
    bossType: "EPIC",
    respawnBaseMinutes: 24 * 60,
    respawnRandomMinutes: 0,
    respawnRandomMode: "PLUS",
  },
  {
    bossType: "UNIQUE",
    respawnBaseMinutes: 24 * 60,
    respawnRandomMinutes: 0,
    respawnRandomMode: "PLUS",
  },
];

async function ensureDefaultBossTypeSettings() {
  const count = await prisma.bossTypeSetting.count();

  if (count > 0) {
    return;
  }

  await prisma.bossTypeSetting.createMany({
    data: defaultBossTypeSettings,
  });
}

export async function GET() {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        timezone: "Europe/Kyiv",
        showScoutCredentials: false,
        soundNotificationMode: "NONE",
      },
    });

    await ensureDefaultBossTypeSettings();

    const bossTypeSettings = await prisma.bossTypeSetting.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      settings: {
        id: settings.id,
        timezone: settings.timezone,
        showScoutCredentials: settings.showScoutCredentials,
        soundNotificationMode: settings.soundNotificationMode ?? "NONE",
      },
      bossTypeSettings,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки настроек" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const timezone = String(body.timezone || "Europe/Kyiv");
    const showScoutCredentials = Boolean(body.showScoutCredentials);
    const bossTypeSettings = Array.isArray(body.bossTypeSettings)
      ? (body.bossTypeSettings as BossTypeSettingInput[])
      : [];
    const soundNotificationMode = body.soundNotificationMode;

    const safeSoundNotificationMode = isSoundNotificationMode(
      soundNotificationMode
    )
      ? soundNotificationMode
      : "NONE";

    for (const item of bossTypeSettings) {
      if (
        !Number.isFinite(item.respawnBaseMinutes) ||
        item.respawnBaseMinutes <= 0
      ) {
        return NextResponse.json(
          { error: `Некорректный базовый респавн для типа ${item.bossType}` },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(item.respawnRandomMinutes) ||
        item.respawnRandomMinutes < 0
      ) {
        return NextResponse.json(
          { error: `Некорректный рандом для типа ${item.bossType}` },
          { status: 400 }
        );
      }
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        timezone,
        showScoutCredentials,
        soundNotificationMode: safeSoundNotificationMode,
      },
      create: {
        id: 1,
        timezone,
        showScoutCredentials,
        soundNotificationMode: safeSoundNotificationMode,
      },
    });

    if (bossTypeSettings.length > 0) {
      await prisma.$transaction(
        bossTypeSettings.map((item) =>
          prisma.bossTypeSetting.upsert({
            where: {
              bossType: item.bossType,
            },
            update: {
              respawnBaseMinutes: item.respawnBaseMinutes,
              respawnRandomMinutes: item.respawnRandomMinutes,
              respawnRandomMode: item.respawnRandomMode,
            },
            create: {
              bossType: item.bossType,
              respawnBaseMinutes: item.respawnBaseMinutes,
              respawnRandomMinutes: item.respawnRandomMinutes,
              respawnRandomMode: item.respawnRandomMode,
            },
          })
        )
      );
    } else {
      await ensureDefaultBossTypeSettings();
    }

    const updatedBossTypeSettings = await prisma.bossTypeSetting.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      settings: {
        id: settings.id,
        timezone: settings.timezone,
        showScoutCredentials: settings.showScoutCredentials,
        soundNotificationMode: settings.soundNotificationMode ?? "NONE",
      },
      bossTypeSettings: updatedBossTypeSettings,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении настроек" },
      { status: 500 }
    );
  }
}