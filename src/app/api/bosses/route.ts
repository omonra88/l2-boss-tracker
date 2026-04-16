import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bosses = await prisma.boss.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json(bosses);
  } catch (error) {
    console.error("GET /api/bosses error:", error);

    return NextResponse.json(
      { error: "Ошибка при загрузке боссов" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const level = Number(body.level);
    const bossTypeRaw = String(body.bossType ?? "").trim();
    const location = body.location == null ? "" : String(body.location).trim();

    const respawnBaseMinutes = Number(body.respawnBaseMinutes);
    const respawnRandomMinutes = Number(body.respawnRandomMinutes);
    const respawnRandomModeRaw = String(body.respawnRandomMode ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Укажи название босса" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(level) || level <= 0 || !Number.isInteger(level)) {
      return NextResponse.json(
        { error: "Некорректный уровень босса" },
        { status: 400 }
      );
    }

    const allowedBossTypes = ["NORMAL", "QUEST", "EPIC", "UNIQUE"] as const;

    if (!allowedBossTypes.includes(bossTypeRaw as any)) {
      return NextResponse.json(
        { error: "Некорректный тип босса" },
        { status: 400 }
      );
    }

    const bossType = bossTypeRaw as (typeof allowedBossTypes)[number];

    if (
      !Number.isFinite(respawnBaseMinutes) ||
      respawnBaseMinutes < 0 ||
      !Number.isInteger(respawnBaseMinutes)
    ) {
      return NextResponse.json(
        { error: "Некорректный базовый респавн" },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(respawnRandomMinutes) ||
      respawnRandomMinutes < 0 ||
      !Number.isInteger(respawnRandomMinutes)
    ) {
      return NextResponse.json(
        { error: "Некорректный рандом респавна" },
        { status: 400 }
      );
    }

    const allowedRandomModes = ["PLUS", "PLUS_MINUS"] as const;

    if (!allowedRandomModes.includes(respawnRandomModeRaw as any)) {
      return NextResponse.json(
        { error: "Некорректный режим рандома" },
        { status: 400 }
      );
    }

    const respawnRandomMode =
      respawnRandomModeRaw as (typeof allowedRandomModes)[number];

    const exists = await prisma.boss.findFirst({
      where: {
        name,
      },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Босс с таким названием уже существует" },
        { status: 409 }
      );
    }

    const boss = await prisma.boss.create({
      data: {
        name,
        level,
        bossType,
        location: location || null,
        respawnBaseMinutes,
        respawnRandomMinutes,
        respawnRandomMode,
      },
    });

    return NextResponse.json({
      success: true,
      boss,
    });
  } catch (error) {
    console.error("POST /api/bosses error:", error);

    return NextResponse.json(
      { error: "Ошибка при создании босса" },
      { status: 500 }
    );
  }
}