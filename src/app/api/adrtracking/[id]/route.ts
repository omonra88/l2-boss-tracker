import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const adrBossId = Number(id);

    if (!Number.isInteger(adrBossId)) {
      return NextResponse.json(
        { error: "Некорректный id" },
        { status: 400 }
      );
    }

    const existing = await prisma.adrBoss.findUnique({
      where: { id: adrBossId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ADR босс не найден" },
        { status: 404 }
      );
    }

    await prisma.adrBossEvent.deleteMany({
      where: { bossName: existing.bossName },
    });

    await prisma.adrBoss.delete({
      where: { id: adrBossId },
    });

    return NextResponse.json({
      ok: true,
      deletedId: adrBossId,
      bossName: existing.bossName,
    });
  } catch (error) {
    console.error("ADR DELETE ERROR:", error);

    return NextResponse.json(
      { error: "Не удалось удалить ADR босса" },
      { status: 500 }
    );
  }
}