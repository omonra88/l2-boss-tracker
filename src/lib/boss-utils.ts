export type RespawnStatus = "waiting" | "window" | "expired" | "unknown";

export function calculateRespawn(boss: any, lastKillAt: Date | string | null) {
  if (!lastKillAt) {
    return {
      respawnStart: null,
      respawnEnd: null,
      status: "unknown" as RespawnStatus,
      countdown: null,
    };
  }

  const lastKillMs = new Date(lastKillAt).getTime();

  if (Number.isNaN(lastKillMs)) {
    return {
      respawnStart: null,
      respawnEnd: null,
      status: "unknown" as RespawnStatus,
      countdown: null,
    };
  }

  const baseMinutes = Number(boss.respawnBaseMinutes ?? 0);
  const randomMinutes = Number(boss.respawnRandomMinutes ?? 0);
  const randomMode = boss.respawnRandomMode ?? "PLUS";

  const baseMs = baseMinutes * 60 * 1000;
  const randomMs = randomMinutes * 60 * 1000;

  let respawnStartMs = lastKillMs + baseMs;
  let respawnEndMs = lastKillMs + baseMs;

  if (randomMode === "PLUS") {
    respawnEndMs = lastKillMs + baseMs + randomMs;
  }

  if (randomMode === "PLUS_MINUS") {
    respawnStartMs = lastKillMs + baseMs - randomMs;
    respawnEndMs = lastKillMs + baseMs + randomMs;
  }

  const now = Date.now();

  let status: RespawnStatus = "unknown";

  if (now < respawnStartMs) {
    status = "waiting";
  } else if (now >= respawnStartMs && now <= respawnEndMs) {
    status = "window";
  } else if (now > respawnEndMs) {
    status = "expired";
  }

  const targetMs = status === "waiting" ? respawnStartMs : respawnEndMs;
  const diffMs = targetMs - now;

  return {
    respawnStart: new Date(respawnStartMs),
    respawnEnd: new Date(respawnEndMs),
    status,
    countdown: formatCountdown(diffMs),
  };
}

export function formatCountdown(diffMs: number) {
  if (!Number.isFinite(diffMs)) return null;

  const absMs = Math.abs(diffMs);
  const totalSeconds = Math.floor(absMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const text = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  return diffMs < 0 ? `-${text}` : text;
}