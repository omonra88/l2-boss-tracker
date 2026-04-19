-- CreateEnum
CREATE TYPE "BossType" AS ENUM ('NORMAL', 'QUEST', 'EPIC', 'UNIQUE');

-- CreateEnum
CREATE TYPE "RespawnRandomMode" AS ENUM ('PLUS', 'PLUS_MINUS');

-- CreateEnum
CREATE TYPE "SoundNotificationMode" AS ENUM ('NONE', 'RANDOM_WINDOW_START', 'RESPAWN_WINDOW_END', 'BOTH');

-- CreateTable
CREATE TABLE "Boss" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "bossType" "BossType" NOT NULL,
    "location" TEXT,
    "respawnBaseMinutes" INTEGER NOT NULL,
    "respawnRandomMinutes" INTEGER NOT NULL DEFAULT 0,
    "respawnRandomMode" "RespawnRandomMode" NOT NULL DEFAULT 'PLUS',

    CONSTRAINT "Boss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedBoss" (
    "id" SERIAL NOT NULL,
    "bossId" INTEGER NOT NULL,
    "scoutNick" TEXT,
    "scoutLogin" TEXT,
    "scoutPassword" TEXT,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastKillAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedBoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv',
    "showScoutCredentials" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "soundNotificationMode" "SoundNotificationMode" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BossTypeSetting" (
    "id" SERIAL NOT NULL,
    "bossType" "BossType" NOT NULL,
    "respawnBaseMinutes" INTEGER NOT NULL,
    "respawnRandomMinutes" INTEGER NOT NULL DEFAULT 0,
    "respawnRandomMode" "RespawnRandomMode" NOT NULL DEFAULT 'PLUS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BossTypeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BossAccount" (
    "id" SERIAL NOT NULL,
    "bossId" INTEGER NOT NULL,
    "characterName" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BossAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdrBoss" (
    "id" SERIAL NOT NULL,
    "bossName" TEXT NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT false,
    "lastEvent" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdrBoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdrBossEvent" (
    "id" SERIAL NOT NULL,
    "bossName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "rawText" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdrBossEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Boss_name_key" ON "Boss"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BossTypeSetting_bossType_key" ON "BossTypeSetting"("bossType");

-- CreateIndex
CREATE UNIQUE INDEX "BossAccount_bossId_key" ON "BossAccount"("bossId");

-- CreateIndex
CREATE UNIQUE INDEX "AdrBoss_bossName_key" ON "AdrBoss"("bossName");

-- AddForeignKey
ALTER TABLE "TrackedBoss" ADD CONSTRAINT "TrackedBoss_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossAccount" ADD CONSTRAINT "BossAccount_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss"("id") ON DELETE CASCADE ON UPDATE CASCADE;
