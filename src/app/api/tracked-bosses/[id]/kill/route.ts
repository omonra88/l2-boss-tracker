import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const trackedId = Number(id);

    if (!trackedId) {
      return NextResponse.json(
        { error: "Некорректный id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const killTime = body.killTime ? new Date(body.killTime) : new Date();

    const updated = await prisma.trackedBoss.update({
      where: { id: trackedId },
      data: {
        lastKillAt: killTime,
      },
      include: {
        boss: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/tracked-bosses/[id]/kill error:", error);

    return NextResponse.json(
      {
        error: "Не удалось сохранить время убийства",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}