import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.TRACKER_API_SECRET;

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
      select: { scannerOnline: true },
    });

    return NextResponse.json({
      online: settings?.scannerOnline ?? false,
    });
  } catch (error) {
    console.error("GET /api/scanner/status error:", error);
    return NextResponse.json(
      { error: "Ошибка получения статуса сканера" },
      { status: 500 }
    );
  }
}

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
    const online = Boolean(body.online);

    await prisma.settings.upsert({
      where: { id: 1 },
      update: { scannerOnline: online },
      create: {
        id: 1,
        scannerOnline: online,
      },
    });

    return NextResponse.json({ ok: true, online });
  } catch (error) {
    console.error("POST /api/scanner/status error:", error);
    return NextResponse.json(
      { ok: false, error: "Ошибка обновления статуса сканера" },
      { status: 500 }
    );
  }
}