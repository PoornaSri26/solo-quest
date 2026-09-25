import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

// Analytics API endpoints
export function setupAnalyticsRoutes(app: any) {
  /**
   * @swagger
   * /api/analytics/events:
   *   post:
   *     summary: Track analytics event
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   */
  app.post('/api/analytics/events', async (req: Request, res: Response) => {
    try {
      const { userId, eventType, eventData, sessionId } = req.body;

      if (!userId || !eventType) {
        return res.status(400).json({ error: 'userId and eventType are required' });
      }

      const event = await prisma.analyticsEvent.create({
        data: {
          userId,
          eventType,
          eventData: eventData ? JSON.stringify(eventData) : null,
          sessionId,
        },
      });

      res.status(201).json(event);
    } catch (error) {
      logger.error('Analytics event tracking error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/events:
   *   get:
   *     summary: Get analytics events for user
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   */
  app.get('/api/analytics/events', async (req: Request, res: Response) => {
    try {
      const { userId, eventType, startDate, endDate } = req.query;

      const where: any = {};
      if (userId) where.userId = userId as string;
      if (eventType) where.eventType = eventType as string;
      if (startDate) where.timestamp = { ...where.timestamp, gte: new Date(startDate as string) };
      if (endDate) where.timestamp = { ...where.timestamp, lte: new Date(endDate as string) };

      const events = await prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      res.json(events);
    } catch (error) {
      logger.error('Get analytics events error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/onboarding:
   *   post:
   *     summary: Track onboarding progress
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   */
  app.post('/api/analytics/onboarding', async (req: Request, res: Response) => {
    try {
      const { userId, currentStep, completedSteps } = req.body;

      if (!userId || !currentStep) {
        return res.status(400).json({ error: 'userId and currentStep are required' });
      }

      const progress = await prisma.onboardingProgress.upsert({
        where: { userId },
        update: {
          currentStep,
          completedSteps: completedSteps ? JSON.stringify(completedSteps) : undefined,
          completedAt: currentStep === 'completed' ? new Date() : undefined,
        },
        create: {
          userId,
          currentStep,
          completedSteps: completedSteps ? JSON.stringify(completedSteps) : '[]',
        },
      });

      res.json(progress);
    } catch (error) {
      logger.error('Onboarding progress tracking error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/onboarding/{userId}:
   *   get:
   *     summary: Get onboarding progress
   *     tags: [Analytics]
   */
  app.get('/api/analytics/onboarding/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const progress = await prisma.onboardingProgress.findUnique({
        where: { userId },
      });

      if (!progress) {
        return res.status(404).json({ error: 'Onboarding progress not found' });
      }

      res.json(progress);
    } catch (error) {
      logger.error('Get onboarding progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/retention:
   *   post:
   *     summary: Update retention metrics
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   */
  app.post('/api/analytics/retention', async (req: Request, res: Response) => {
    try {
      const { userId, day1Active, day7Active, day30Active, sessionDuration } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const metrics = await prisma.retentionMetrics.upsert({
        where: { userId },
        update: {
          day1Active: day1Active !== undefined ? day1Active : undefined,
          day7Active: day7Active !== undefined ? day7Active : undefined,
          day30Active: day30Active !== undefined ? day30Active : undefined,
          lastActiveAt: new Date(),
          totalSessions: { increment: 1 },
          avgSessionDuration: sessionDuration ? { 
            set: (await prisma.retentionMetrics.findUnique({ where: { userId } }))?.avgSessionDuration || 0 
          } : undefined,
        },
        create: {
          userId,
          day1Active: day1Active || false,
          day7Active: day7Active || false,
          day30Active: day30Active || false,
          totalSessions: 1,
          avgSessionDuration: sessionDuration || 0,
        },
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Retention metrics update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/retention/{userId}:
   *   get:
   *     summary: Get retention metrics
   *     tags: [Analytics]
   */
  app.get('/api/analytics/retention/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const metrics = await prisma.retentionMetrics.findUnique({
        where: { userId },
      });

      if (!metrics) {
        return res.status(404).json({ error: 'Retention metrics not found' });
      }

      res.json(metrics);
    } catch (error) {
      logger.error('Get retention metrics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/funnel:
   *   get:
   *     summary: Get onboarding funnel data
   *     tags: [Analytics]
   */
  app.get('/api/analytics/funnel', async (req: Request, res: Response) => {
    try {
      const funnelData = await prisma.onboardingProgress.findMany({
        select: {
          currentStep: true,
          completedSteps: true,
          startedAt: true,
          completedAt: true,
        },
      });

      // Calculate funnel metrics
      const totalStarted = funnelData.length;
      const stepCounts: Record<string, number> = {};
      
      funnelData.forEach(progress => {
        const steps = JSON.parse(progress.completedSteps || '[]');
        steps.forEach((step: string) => {
          stepCounts[step] = (stepCounts[step] || 0) + 1;
        });
        stepCounts[progress.currentStep] = (stepCounts[progress.currentStep] || 0) + 1;
      });

      const funnel = Object.entries(stepCounts).map(([step, count]) => ({
        step,
        count,
        percentage: totalStarted > 0 ? (count / totalStarted) * 100 : 0,
      }));

      res.json({
        totalStarted,
        funnel,
        completed: funnelData.filter(p => p.completedAt).length,
      });
    } catch (error) {
      logger.error('Get funnel data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/analytics/retention-summary:
   *   get:
   *     summary: Get retention summary
   *     tags: [Analytics]
   */
  app.get('/api/analytics/retention-summary', async (req: Request, res: Response) => {
    try {
      const totalUsers = await prisma.retentionMetrics.count();
      const day1Retention = await prisma.retentionMetrics.count({ where: { day1Active: true } });
      const day7Retention = await prisma.retentionMetrics.count({ where: { day7Active: true } });
      const day30Retention = await prisma.retentionMetrics.count({ where: { day30Active: true } });

      res.json({
        totalUsers,
        day1Retention: {
          count: day1Retention,
          rate: totalUsers > 0 ? (day1Retention / totalUsers) * 100 : 0,
        },
        day7Retention: {
          count: day7Retention,
          rate: totalUsers > 0 ? (day7Retention / totalUsers) * 100 : 0,
        },
        day30Retention: {
          count: day30Retention,
          rate: totalUsers > 0 ? (day30Retention / totalUsers) * 100 : 0,
        },
      });
    } catch (error) {
      logger.error('Get retention summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}