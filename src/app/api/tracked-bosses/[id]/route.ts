import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const trackedId = Number(id);

    if (!trackedId) {
      return NextResponse.json(
        { error: "Некорректный id" },
        { status: 400 }
      );
    }

    await prisma.trackedBoss.delete({
      where: { id: trackedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tracked-bosses/[id] error:", error);

    return NextResponse.json(
      {
        error: "Не удалось удалить босса из мониторинга",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}