import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bossId = Number(id);

    if (!Number.isFinite(bossId)) {
      return NextResponse.json(
        { error: "Некорректный id босса" },
        { status: 400 }
      );
    }

    await prisma.boss.delete({
      where: {
        id: bossId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/bosses/[id] error:", error);

    return NextResponse.json(
      { error: "Ошибка при удалении босса" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bossId = Number(id);

    if (!Number.isFinite(bossId)) {
      return NextResponse.json(
        { error: "Некорректный id босса" },
        { status: 400 }
      );
    }

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
        NOT: {
          id: bossId,
        },
      },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Босс с таким названием уже существует" },
        { status: 409 }
      );
    }

    const boss = await prisma.boss.update({
      where: {
        id: bossId,
      },
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
    console.error("PUT /api/bosses/[id] error:", error);

    return NextResponse.json(
      { error: "Ошибка при обновлении босса" },
      { status: 500 }
    );
  }
}