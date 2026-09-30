/**
 * Superadmin seed script
 * Creates (or promotes) the platform superadmin account.
 *
 * Usage:
 *   cd server
 *   npm run prisma:seed:admin
 *
 * Credentials come from env vars:
 *   SUPERADMIN_EMAIL    (default: admin@soloquest.app)
 *   SUPERADMIN_PASSWORD (default: ChangeMe!2026  -- CHANGE THIS IN PRODUCTION)
 *   SUPERADMIN_NAME     (default: Platform Admin)
 *
 * Idempotent: safe to run repeatedly. Re-running with a different
 * SUPERADMIN_PASSWORD resets the admin password.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Match server/src/index.ts: honor DATABASE_URL so the seed lands in the
// same database the app actually uses (falls back to the schema default).
const prisma = new PrismaClient(
  process.env.DATABASE_URL
    ? { datasources: { db: { url: process.env.DATABASE_URL } } }
    : undefined
);

const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || 'admin@soloquest.app').toLowerCase().trim();
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'ChangeMe!2026';
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Platform Admin';

const isProduction = process.env.NODE_ENV === 'production';

async function main() {
  // Never allow the well-known default password to reach a production database.
  if (isProduction && !process.env.SUPERADMIN_PASSWORD) {
    console.error(
      '❌ Refusing to seed superadmin in production with the default password.\n' +
        '   Set SUPERADMIN_PASSWORD before running this script.'
    );
    process.exit(1);
  }

  console.log('Seeding superadmin...');

  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email: SUPERADMIN_EMAIL } });

  if (existing) {
    // Promote existing account to superadmin and refresh password
    await prisma.user.update({
      where: { email: SUPERADMIN_EMAIL },
      data: { role: 'SUPERADMIN', passwordHash, deletedAt: null },
    });

    // Guarantee stats exist even if the account was created before onboarding ran
    await prisma.hunterStats.upsert({
      where: { userId: existing.id },
      create: {
        userId: existing.id,
        level: 1,
        exp: 0,
        expToNext: 100,
        rank: 'S',
        hp: 100,
        hpMax: 100,
        gold: 0,
      },
      update: {},
    });

    console.log(`✅ Existing user ${SUPERADMIN_EMAIL} promoted to SUPERADMIN.`);
  } else {
    const admin = await createUserWithStats(passwordHash);
    console.log(`✅ Superadmin created: ${admin.email} (${admin.hunterId})`);
  }

  if (!isProduction) {
    console.log('⚠️  Change the default password immediately in production!');
  }
}

/**
 * Create the admin user, retrying on hunterId unique-constraint collisions
 * (the HNT-ADM-#### pool is small). Stats are created in the same transaction
 * so a half-created admin can never exist.
 */
async function createUserWithStats(passwordHash: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const hunterId = `HNT-ADM-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      return await prisma.$transaction(async (tx) => {
        const admin = await tx.user.create({
          data: {
            email: SUPERADMIN_EMAIL,
            displayName: SUPERADMIN_NAME,
            passwordHash,
            hunterId,
            role: 'SUPERADMIN',
          },
        });
        await tx.hunterStats.create({
          data: {
            userId: admin.id,
            level: 1,
            exp: 0,
            expToNext: 100,
            rank: 'S',
            hp: 100,
            hpMax: 100,
            gold: 0,
          },
        });
        return admin;
      });
    } catch (error: any) {
      const isUniqueCollision =
        error?.code === 'P2002' && String(error?.meta?.target).includes('hunterId');
      if (!isUniqueCollision || attempt === 4) throw error;
      console.warn(`hunterId collision (${hunterId}), retrying...`);
    }
  }
  throw new Error('unreachable');
}

main()
  .catch((e) => {
    console.error('Superadmin seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
