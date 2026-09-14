import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

/**
 * Check if user has a specific subscription tier
 */
export async function hasSubscriptionTier(userId: string, requiredTier: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return requiredTier === 'free';
  }

  // Check if subscription is active
  if (subscription.status !== 'active') {
    return requiredTier === 'free';
  }

  // Check if subscription is expired
  if (subscription.endDate && new Date() > subscription.endDate) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { plan: 'free', status: 'canceled' },
    });
    return requiredTier === 'free';
  }

  // Tier hierarchy: free < hunter_pass < guild < enterprise
  const tierHierarchy = ['free', 'hunter_pass', 'guild', 'enterprise'];
  const userTierIndex = tierHierarchy.indexOf(subscription.plan);
  const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

  return userTierIndex >= requiredTierIndex;
}

/**
 * Middleware to require specific subscription tier
 */
export const requireSubscriptionTier = (requiredTier: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAccess = await hasSubscriptionTier(userId, requiredTier);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Premium feature',
          requiredTier,
          message: `This feature requires ${requiredTier} subscription`
        });
      }

      next();
    } catch (error) {
      logger.error('Entitlement check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require any paid subscription
 */
export const requirePaidSubscription = (req: any, res: Response, next: NextFunction) => {
  return requireSubscriptionTier('hunter_pass')(req, res, next);
};

/**
 * Get user's entitlements
 */
export async function getUserEntitlements(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      plan: 'free',
      status: 'active',
      features: {
        maxDailyDungeons: 1,
        maxGateSlots: 1,
        maxQuests: 10,
        streakFreezeTokens: 0,
        advancedStats: false,
        priorityQueue: false,
        customQuests: false,
        apiAccess: false,
        whiteLabel: false,
      },
      settings: userSettings || {
        simpleMode: false,
        penaltySeverity: 'forgiving',
        notificationPreference: 'adaptive',
      },
    };
  }

  // Check subscription status
  let isActive = subscription.status === 'active';
  if (subscription.endDate && new Date() > subscription.endDate) {
    isActive = false;
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { plan: 'free', status: 'canceled' },
    });
  }

  // Define features by tier
  const tierFeatures = {
    free: {
      maxDailyDungeons: 1,
      maxGateSlots: 1,
      maxQuests: 10,
      streakFreezeTokens: 0,
      advancedStats: false,
      priorityQueue: false,
      customQuests: false,
      apiAccess: false,
      whiteLabel: false,
    },
    hunter_pass: {
      maxDailyDungeons: 3,
      maxGateSlots: 3,
      maxQuests: 50,
      streakFreezeTokens: 5,
      advancedStats: true,
      priorityQueue: true,
      customQuests: true,
      apiAccess: false,
      whiteLabel: false,
    },
    guild: {
      maxDailyDungeons: 5,
      maxGateSlots: 10,
      maxQuests: 100,
      streakFreezeTokens: 10,
      advancedStats: true,
      priorityQueue: true,
      customQuests: true,
      apiAccess: true,
      whiteLabel: false,
    },
    enterprise: {
      maxDailyDungeons: 999,
      maxGateSlots: 999,
      maxQuests: 999,
      streakFreezeTokens: 999,
      advancedStats: true,
      priorityQueue: true,
      customQuests: true,
      apiAccess: true,
      whiteLabel: true,
    },
  };

  const currentPlan = isActive ? subscription.plan : 'free';
  const features = tierFeatures[currentPlan as keyof typeof tierFeatures] || tierFeatures.free;

  return {
    plan: currentPlan,
    status: isActive ? subscription.status : 'canceled',
    endDate: subscription.endDate,
    features,
    settings: userSettings || {
      simpleMode: false,
      penaltySeverity: 'forgiving',
      notificationPreference: 'adaptive',
    },
  };
}

/**
 * Check if user can perform an action based on limits
 */
export async function checkUserLimits(userId: string, action: string) {
  const entitlements = await getUserEntitlements(userId);
  const userStats = await prisma.hunterStats.findUnique({
    where: { userId },
  });

  switch (action) {
    case 'create_quest':
      const currentQuests = await prisma.quest.count({
        where: { userId, status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
      });
      return currentQuests < entitlements.features.maxQuests;

    case 'create_gate':
      const currentGates = await prisma.gate.count({
        where: { userId, status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
      });
      return currentGates < entitlements.features.maxGateSlots;

    case 'use_streak_freeze':
      return entitlements.features.streakFreezeTokens > 0;

    default:
      return true;
  }
}