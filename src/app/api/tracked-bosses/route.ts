import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRespawn } from "@/lib/boss-utils";

export async function GET() {
  try {
    const trackedBosses = await prisma.trackedBoss.findMany({
      include: {
        boss: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const result = trackedBosses.map((item) => {
      const respawn = calculateRespawn(item.boss, item.lastKillAt);

      return {
        id: item.id,
        bossId: item.bossId,
        lastKillAt: item.lastKillAt,
        boss: {
          id: item.boss.id,
          name: item.boss.name,
          level: item.boss.level,
          bossType: item.boss.bossType,
          location: item.boss.location,
          respawnBaseMinutes: item.boss.respawnBaseMinutes,
          respawnRandomMinutes: item.boss.respawnRandomMinutes,
          respawnRandomMode: item.boss.respawnRandomMode,
        },
        respawn,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/tracked-bosses error:", error);

    return NextResponse.json(
      { error: "Ошибка при загрузке мониторинга" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bossId = Number(body.bossId);

    if (!Number.isFinite(bossId)) {
      return NextResponse.json(
        { error: "Некорректный bossId" },
        { status: 400 }
      );
    }

    const boss = await prisma.boss.findUnique({
      where: {
        id: bossId,
      },
    });

    if (!boss) {
      return NextResponse.json(
        { error: "Босс не найден" },
        { status: 404 }
      );
    }

    const exists = await prisma.trackedBoss.findFirst({
      where: {
        bossId,
      },
      include: {
        boss: true,
      },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Босс уже добавлен в мониторинг" },
        { status: 409 }
      );
    }

    const trackedBoss = await prisma.trackedBoss.create({
      data: {
        bossId,
      },
      include: {
        boss: true,
      },
    });

    return NextResponse.json({
      success: true,
      boss: trackedBoss.boss,
      trackedBoss,
    });
  } catch (error) {
    console.error("POST /api/tracked-bosses error:", error);

    return NextResponse.json(
      { error: "Ошибка при добавлении в мониторинг" },
      { status: 500 }
    );
  }
}