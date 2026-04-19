import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.TRACKER_API_SECRET;

export async function POST(req: NextRequest) {
  try {
    const incomingSecret = req.headers.get("x-adr-secret");

    if (!SECRET || incomingSecret !== SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      bossName,
      eventType,
      rawText,
      source,
      receivedAt,
    } = body;

    if (!bossName || !eventType) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    const eventTime = new Date(receivedAt ?? Date.now());

    const normalizedEventType =
      eventType === "RESPAWN" ? "RESPAWN" : "DEAD";

    const boss = await prisma.adrBoss.upsert({
      where: { bossName },
      update: {
        isAlive: normalizedEventType === "RESPAWN",
        lastEvent: normalizedEventType,
        lastEventAt: eventTime,
        lastKillAt:
          normalizedEventType === "DEAD"
            ? eventTime
            : null,
      },
      create: {
        bossName,
        isAlive: normalizedEventType === "RESPAWN",
        lastEvent: normalizedEventType,
        lastEventAt: eventTime,
        lastKillAt:
          normalizedEventType === "DEAD"
            ? eventTime
            : null,
      },
    });

    await prisma.adrBossEvent.create({
      data: {
        bossName,
        eventType: normalizedEventType,
        rawText,
        source: source ?? "telegram",
        createdAt: eventTime,
      },
    });

    return NextResponse.json({
      ok: true,
      bossId: boss.id,
    });
  } catch (error) {
    console.error("ADR EVENT ERROR:", error);

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}