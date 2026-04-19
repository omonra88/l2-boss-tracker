import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RespawnStatus = "waiting" | "window" | "expired" | "unknown";

function calculateRespawn(
  lastKillAt: Date | null,
  respawnBaseMinutes: number,
  respawnRandomMinutes: number,
  respawnRandomMode: "PLUS" | "PLUS_MINUS"
) {
  if (!lastKillAt) {
    return null;
  }

  const lastKillMs = lastKillAt.getTime();

  if (Number.isNaN(lastKillMs)) {
    return null;
  }

  const baseMs = respawnBaseMinutes * 60 * 1000;
  const randomMs = respawnRandomMinutes * 60 * 1000;

  let respawnStartMs = lastKillMs + baseMs;
  let respawnEndMs = lastKillMs + baseMs;

  if (respawnRandomMinutes > 0) {
    if (respawnRandomMode === "PLUS") {
      respawnStartMs = lastKillMs + baseMs;
      respawnEndMs = lastKillMs + baseMs + randomMs;
    } else {
      respawnStartMs = lastKillMs + baseMs - randomMs;
      respawnEndMs = lastKillMs + baseMs + randomMs;
    }
  }

  const now = Date.now();

  let status: RespawnStatus = "unknown";

  if (now < respawnStartMs) {
    status = "waiting";
  } else if (now >= respawnStartMs && now <= respawnEndMs) {
    status = "window";
  } else {
    status = "expired";
  }

  return {
    respawnStart: new Date(respawnStartMs).toISOString(),
    respawnEnd: new Date(respawnEndMs).toISOString(),
    status,
    countdown: null,
  };
}

export async function GET() {
  try {
    const adrBosses = await prisma.adrBoss.findMany({
      orderBy: [{ isAlive: "desc" }, { bossName: "asc" }],
    });

    const baseBosses = await prisma.boss.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        bossType: true,
        location: true,
        respawnBaseMinutes: true,
        respawnRandomMinutes: true,
        respawnRandomMode: true,
      },
    });

    const bossMap = new Map(
      baseBosses.map((boss) => [boss.name.toLowerCase(), boss])
    );

    const result = adrBosses.map((adrBoss) => {
      const baseBoss = bossMap.get(adrBoss.bossName.toLowerCase());

      const bossData = {
        id: baseBoss?.id ?? adrBoss.id,
        name: adrBoss.bossName,
        level: baseBoss?.level ?? 0,
        bossType: baseBoss?.bossType ?? "NORMAL",
        location: baseBoss?.location ?? null,
        respawnBaseMinutes: baseBoss?.respawnBaseMinutes ?? 0,
        respawnRandomMinutes: baseBoss?.respawnRandomMinutes ?? 0,
        respawnRandomMode: baseBoss?.respawnRandomMode ?? "PLUS",
      };

      const hasRespawn =
        Boolean(baseBoss) && (baseBoss?.respawnBaseMinutes ?? 0) > 0;

      if (adrBoss.isAlive) {
        return {
          id: adrBoss.id,
          lastKillAt: adrBoss.lastKillAt?.toISOString() ?? null,
          adrState: "RESPAWNED" as const,
          hasBaseBoss: Boolean(baseBoss),
          hasRespawn,
          boss: bossData,
          respawn: null,
        };
      }

      const respawn = baseBoss
        ? calculateRespawn(
            adrBoss.lastKillAt,
            baseBoss.respawnBaseMinutes,
            baseBoss.respawnRandomMinutes,
            baseBoss.respawnRandomMode
          )
        : null;

      return {
        id: adrBoss.id,
        lastKillAt: adrBoss.lastKillAt?.toISOString() ?? null,
        adrState: "WAITING" as const,
        hasBaseBoss: Boolean(baseBoss),
        hasRespawn,
        boss: bossData,
        respawn,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("ADR GET ERROR:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить ADR мониторинг" },
      { status: 500 }
    );
  }
}