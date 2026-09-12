import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Mementos
  const mementos = await Promise.all([
    prisma.memento.create({
      data: {
        name: 'First Blood',
        description: 'Complete your first quest',
        icon: '⚔️',
        rarity: 'COMMON',
        category: 'ACHIEVEMENT',
      },
    }),
    prisma.memento.create({
      data: {
        name: 'Hunter Badge',
        description: 'Reach Rank D',
        icon: '🎖️',
        rarity: 'UNCOMMON',
        category: 'RANK',
      },
    }),
    prisma.memento.create({
      data: {
        name: 'Elite Hunter',
        description: 'Reach Rank A',
        icon: '🏆',
        rarity: 'RARE',
        category: 'RANK',
      },
    }),
    prisma.memento.create({
      data: {
        name: 'Shadow Monarch',
        description: 'Reach Rank S',
        icon: '👑',
        rarity: 'LEGENDARY',
        category: 'RANK',
      },
    }),
    prisma.memento.create({
      data: {
        name: 'Streak Master',
        description: 'Achieve a 7-day streak',
        icon: '🔥',
        rarity: 'RARE',
        category: 'STREAK',
      },
    }),
    prisma.memento.create({
      data: {
        name: 'Dungeon Conqueror',
        description: 'Complete 10 dungeons',
        icon: '🏰',
        rarity: 'EPIC',
        category: 'DUNGEON',
      },
    }),
  ]);

  console.log(`Created ${mementos.length} mementos`);

  // Create Milestones
  const milestones = await Promise.all([
    prisma.milestone.create({
      data: {
        name: 'First Steps',
        description: 'Complete your first quest',
        requirement: 'Complete 1 quest',
        xpReward: 50,
        goldReward: 25,
        mementoId: mementos[0].id,
      },
    }),
    prisma.milestone.create({
      data: {
        name: 'Apprentice Hunter',
        description: 'Complete 10 quests',
        requirement: 'Complete 10 quests',
        xpReward: 200,
        goldReward: 100,
      },
    }),
    prisma.milestone.create({
      data: {
        name: 'Skilled Hunter',
        description: 'Complete 50 quests',
        requirement: 'Complete 50 quests',
        xpReward: 1000,
        goldReward: 500,
        mementoId: mementos[1].id,
      },
    }),
    prisma.milestone.create({
      data: {
        name: 'Master Hunter',
        description: 'Complete 100 quests',
        requirement: 'Complete 100 quests',
        xpReward: 5000,
        goldReward: 2500,
      },
    }),
    prisma.milestone.create({
      data: {
        name: 'Legendary Hunter',
        description: 'Complete 500 quests',
        requirement: 'Complete 500 quests',
        xpReward: 25000,
        goldReward: 12500,
        mementoId: mementos[2].id,
      },
    }),
  ]);

  console.log(`Created ${milestones.length} milestones`);

  // Create Mastery Challenges
  const challenges = await Promise.all([
    prisma.masteryChallenge.create({
      data: {
        name: 'Speed Demon',
        description: 'Complete 5 quests in under 24 hours',
        requirement: 'Complete 5 quests in 24 hours',
        xpReward: 300,
        goldReward: 150,
        difficulty: 'EASY',
      },
    }),
    prisma.masteryChallenge.create({
      data: {
        name: 'Perfectionist',
        description: 'Complete 10 quests with Perfect quality',
        requirement: '10 Perfect completions',
        xpReward: 1000,
        goldReward: 500,
        difficulty: 'MEDIUM',
      },
    }),
    prisma.masteryChallenge.create({
      data: {
        name: 'Dungeon Master',
        description: 'Complete the Daily Dungeon 7 days in a row',
        requirement: '7 consecutive dungeon completions',
        xpReward: 2000,
        goldReward: 1000,
        difficulty: 'HARD',
      },
    }),
    prisma.masteryChallenge.create({
      data: {
        name: 'Gold Hoarder',
        description: 'Accumulate 5000 gold',
        requirement: 'Reach 5000 gold',
        xpReward: 1500,
        goldReward: 0,
        difficulty: 'MEDIUM',
      },
    }),
    prisma.masteryChallenge.create({
      data: {
        name: 'Streak Warrior',
        description: 'Maintain a 30-day streak',
        requirement: '30-day consecutive streak',
        xpReward: 5000,
        goldReward: 2500,
        difficulty: 'HARD',
      },
    }),
  ]);

  console.log(`Created ${challenges.length} mastery challenges`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
