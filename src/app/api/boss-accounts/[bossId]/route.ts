import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    bossId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { bossId } = await context.params;
    const parsedBossId = Number(bossId);

    if (!Number.isInteger(parsedBossId) || parsedBossId <= 0) {
      return NextResponse.json(
        { error: "Некорректный id босса" },
        { status: 400 }
      );
    }

    const boss = await prisma.boss.findUnique({
      where: { id: parsedBossId },
      include: {
        account: true,
      },
    });

    if (!boss) {
      return NextResponse.json({ error: "Босс не найден" }, { status: 404 });
    }

    return NextResponse.json({
      boss: {
        id: boss.id,
        name: boss.name,
      },
      account: boss.account,
    });
  } catch (error) {
    console.error("GET /api/boss-accounts/[bossId] error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки аккаунта" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { bossId } = await context.params;
    const parsedBossId = Number(bossId);

    if (!Number.isInteger(parsedBossId) || parsedBossId <= 0) {
      return NextResponse.json(
        { error: "Некорректный id босса" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const characterName = String(body.characterName || "").trim();
    const login = String(body.login || "").trim();
    const password = String(body.password || "").trim();

    if (!characterName) {
      return NextResponse.json(
        { error: "Укажи ник персонажа" },
        { status: 400 }
      );
    }

    if (!login) {
      return NextResponse.json({ error: "Укажи логин" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Укажи пароль" }, { status: 400 });
    }

    const boss = await prisma.boss.findUnique({
      where: { id: parsedBossId },
    });

    if (!boss) {
      return NextResponse.json({ error: "Босс не найден" }, { status: 404 });
    }

    const account = await prisma.bossAccount.upsert({
      where: {
        bossId: parsedBossId,
      },
      update: {
        characterName,
        login,
        password,
      },
      create: {
        bossId: parsedBossId,
        characterName,
        login,
        password,
      },
    });

    return NextResponse.json({
      success: true,
      account,
      boss: {
        id: boss.id,
        name: boss.name,
      },
    });
  } catch (error) {
    console.error("PUT /api/boss-accounts/[bossId] error:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения аккаунта" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { bossId } = await context.params;
    const parsedBossId = Number(bossId);

    if (!Number.isInteger(parsedBossId) || parsedBossId <= 0) {
      return NextResponse.json(
        { error: "Некорректный id босса" },
        { status: 400 }
      );
    }

    const existing = await prisma.bossAccount.findUnique({
      where: {
        bossId: parsedBossId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Аккаунт для этого босса не найден" },
        { status: 404 }
      );
    }

    await prisma.bossAccount.delete({
      where: {
        bossId: parsedBossId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE /api/boss-accounts/[bossId] error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления аккаунта" },
      { status: 500 }
    );
  }
}