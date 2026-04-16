import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const result = await prisma.trackedBoss.updateMany({
      data: {
        lastKillAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      clearedCount: result.count,
    });
  } catch (error) {
    console.error("POST /api/tracked-bosses/clear-all error:", error);
    return NextResponse.json(
      { error: "Ошибка при очистке всех записей мониторинга" },
      { status: 500 }
    );
  }
}