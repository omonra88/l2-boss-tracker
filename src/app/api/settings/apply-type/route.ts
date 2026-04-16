import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const bossType = String(body.bossType ?? "").trim();
    const respawnBaseMinutes = Number(body.respawnBaseMinutes);
    const respawnRandomMinutes = Number(body.respawnRandomMinutes);
    const respawnRandomMode = String(body.respawnRandomMode ?? "").trim();

    const allowedBossTypes = ["NORMAL", "QUEST", "EPIC", "UNIQUE"] as const;
    const allowedRandomModes = ["PLUS", "PLUS_MINUS"] as const;

    if (
      !allowedBossTypes.includes(
        bossType as (typeof allowedBossTypes)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Некорректный тип босса" },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(respawnBaseMinutes) ||
      !Number.isInteger(respawnBaseMinutes) ||
      respawnBaseMinutes <= 0
    ) {
      return NextResponse.json(
        { error: "Некорректный базовый респавн" },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(respawnRandomMinutes) ||
      !Number.isInteger(respawnRandomMinutes) ||
      respawnRandomMinutes < 0
    ) {
      return NextResponse.json(
        { error: "Некорректный рандом респавна" },
        { status: 400 }
      );
    }

    if (
      !allowedRandomModes.includes(
        respawnRandomMode as (typeof allowedRandomModes)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Некорректный режим респавна" },
        { status: 400 }
      );
    }

    const typedBossType = bossType as (typeof allowedBossTypes)[number];
    const typedRandomMode =
      respawnRandomMode as (typeof allowedRandomModes)[number];

    const result = await prisma.boss.updateMany({
      where: {
        bossType: typedBossType,
      },
      data: {
        respawnBaseMinutes,
        respawnRandomMinutes,
        respawnRandomMode: typedRandomMode,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("POST /api/settings/apply-type error:", error);

    return NextResponse.json(
      { error: "Ошибка при применении шаблона" },
      { status: 500 }
    );
  }
}