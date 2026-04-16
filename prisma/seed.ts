import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bosses = [
    {
      name: "Queen Ant",
      bossType: "EPIC",
      location: "Ant Nest",
      respawnBaseMinutes: 20 * 60,
      respawnRandomMinutes: 4 * 60,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Core",
      bossType: "EPIC",
      location: "Cruma Tower",
      respawnBaseMinutes: 24 * 60,
      respawnRandomMinutes: 0,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Orfen",
      bossType: "EPIC",
      location: "Sea of Spores",
      respawnBaseMinutes: 24 * 60,
      respawnRandomMinutes: 4 * 60,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Zaken",
      bossType: "EPIC",
      location: "Devil's Isle",
      respawnBaseMinutes: 48 * 60,
      respawnRandomMinutes: 0,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Baium",
      bossType: "EPIC",
      location: "Tower of Insolence",
      respawnBaseMinutes: 120 * 60,
      respawnRandomMinutes: 0,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Antharas",
      bossType: "EPIC",
      location: "Antharas' Lair",
      respawnBaseMinutes: 192 * 60,
      respawnRandomMinutes: 0,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Valakas",
      bossType: "EPIC",
      location: "Forge of the Gods",
      respawnBaseMinutes: 264 * 60,
      respawnRandomMinutes: 0,
      respawnRandomMode: "PLUS",
    },
    {
      name: "Adena Goblin",
      bossType: "NORMAL",
      location: null,
      respawnBaseMinutes: 8 * 60,
      respawnRandomMinutes: 30,
      respawnRandomMode: "PLUS_MINUS",
    },
  ] as any[];

  await prisma.boss.createMany({
    data: bosses,
    skipDuplicates: true,
  });

  const settingsCount = await prisma.settings.count();

  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        id: 1,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });