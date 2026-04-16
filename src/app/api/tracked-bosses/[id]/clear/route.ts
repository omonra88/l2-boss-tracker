import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const trackedBossId = Number(id);

    if (!Number.isInteger(trackedBossId) || trackedBossId <= 0) {
      return NextResponse.json(
        { error: "Некорректный id записи мониторинга" },
        { status: 400 }
      );
    }

    const existing = await prisma.trackedBoss.findUnique({
      where: { id: trackedBossId },
      include: {
        boss: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Запись мониторинга не найдена" },
        { status: 404 }
      );
    }

    const updated = await prisma.trackedBoss.update({
      where: { id: trackedBossId },
      data: {
        lastKillAt: null,
      },
      include: {
        boss: true,
      },
    });

    return NextResponse.json({
      success: true,
      boss: updated.boss,
      trackedBoss: updated,
    });
  } catch (error) {
    console.error("POST /api/tracked-bosses/[id]/clear error:", error);
    return NextResponse.json(
      { error: "Ошибка при очистке записи мониторинга" },
      { status: 500 }
    );
  }
}