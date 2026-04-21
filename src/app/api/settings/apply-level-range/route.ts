import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const levelMin = Number(body.levelMin);
    const levelMax = Number(body.levelMax);
    const respawnBaseMinutes = Number(body.respawnBaseMinutes);
    const respawnRandomMinutes = Number(body.respawnRandomMinutes);
    const respawnRandomMode = String(body.respawnRandomMode ?? "").trim();

    const allowedRandomModes = ["PLUS", "PLUS_MINUS"] as const;

    if (
      !Number.isFinite(levelMin) ||
      !Number.isInteger(levelMin) ||
      levelMin < 1
    ) {
      return NextResponse.json(
        { error: "Некорректный минимальный уровень" },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(levelMax) ||
      !Number.isInteger(levelMax) ||
      levelMax < levelMin
    ) {
      return NextResponse.json(
        { error: "Максимальный уровень должен быть >= минимального" },
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

    const typedRandomMode =
      respawnRandomMode as (typeof allowedRandomModes)[number];

    const result = await prisma.boss.updateMany({
      where: {
        level: {
          gte: levelMin,
          lte: levelMax,
        },
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
      levelMin,
      levelMax,
    });
  } catch (error) {
    console.error("POST /api/settings/apply-level-range error:", error);

    return NextResponse.json(
      { error: "Ошибка при применении шаблона по уровню" },
      { status: 500 }
    );
  }
}
