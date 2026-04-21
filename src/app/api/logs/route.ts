// src/app/api/logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const skip = (page - 1) * limit;

    const bossName = searchParams.get("bossName")?.trim() || undefined;
    const eventType = searchParams.get("eventType")?.trim() || undefined;
    const source = searchParams.get("source")?.trim() || undefined;

    const where: {
      bossName?: { contains: string; mode: "insensitive" };
      eventType?: string;
      source?: string;
    } = {};

    if (bossName) {
      where.bossName = { contains: bossName, mode: "insensitive" };
    }

    if (eventType && ["DEAD", "RESPAWN"].includes(eventType)) {
      where.eventType = eventType;
    }

    if (source) {
      where.source = source;
    }

    const [total, events] = await Promise.all([
      prisma.adrBossEvent.count({ where }),
      prisma.adrBossEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки логов" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get("confirm");

    if (confirm !== "true") {
      return NextResponse.json(
        { error: "Передай ?confirm=true для подтверждения очистки логов" },
        { status: 400 }
      );
    }

    const result = await prisma.adrBossEvent.deleteMany({});

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error("DELETE /api/logs error:", error);
    return NextResponse.json(
      { error: "Ошибка при очистке логов" },
      { status: 500 }
    );
  }
}
