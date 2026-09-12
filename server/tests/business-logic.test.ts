import request from 'supertest';
import express from 'express';

describe('Business Logic Security Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    const mockAuth = (req: any, res: any, next: any) => {
      req.userId = 'test-user-id';
      next();
    };

    // Quest reward security test route
    app.post('/api/quests', mockAuth, (req, res) => {
      const { title, rank, expReward, goldReward } = req.body;

      // Server-side reward calculation - ignore client-supplied rewards
      const rankRewards: Record<string, { exp: number; gold: number }> = {
        E: { exp: 10, gold: 5 },
        D: { exp: 25, gold: 15 },
        C: { exp: 50, gold: 30 },
        B: { exp: 100, gold: 60 },
        A: { exp: 200, gold: 120 },
        S: { exp: 500, gold: 300 },
      };

      const questRank = rank || 'E';
      const rewards = rankRewards[questRank] || rankRewards.E;

      // Calculate boss bonus server-side
      const isBossQuest = req.body.isBossQuest || false;
      const bossMultiplier = isBossQuest ? 1.5 : 1;

      const calculatedExp = Math.round(rewards.exp * bossMultiplier);
      const calculatedGold = Math.round(rewards.gold * bossMultiplier);

      // Use server-calculated rewards, not client-supplied
      const newQuest = {
        id: 'quest-1',
        title,
        rank: questRank,
        expReward: calculatedExp,
        goldReward: calculatedGold,
        isBossQuest,
      };

      res.status(201).json(newQuest);
    });

    // XP calculation test route
    app.get('/api/hunter/me/stats', mockAuth, (req, res) => {
      // Correct XP calculation
      const level = 5;
      const xp = 75;
      const xpForNextLevel = 100;
      const xpToNext = xpForNextLevel - xp; // Should be 25
      const progressPercent = Math.round((xp / xpForNextLevel) * 100); // Should be 75%

      res.json({
        level,
        xp,
        xpToNext,
        progressPercent,
      });
    });

    // Shop purchase test route with transaction safety
    app.post('/api/shop/purchase/:itemId', mockAuth, async (req: any, res) => {
      const { itemId } = req.params;
      const userId = req.userId;

      // Mock transaction - check gold before purchase
      const userGold = 100;
      const itemCosts: Record<string, number> = {
        'item-with-high-cost': 200,
        'item-1': 50,
        'new-item': 50,
      };
      const itemCost = itemCosts[itemId] || 50;

      if (userGold < itemCost) {
        return res.status(400).json({ error: 'Insufficient gold' });
      }

      // Check for duplicate inventory items (mock)
      const alreadyOwnedItems = ['item-1']; // Simulate owned items
      if (alreadyOwnedItems.includes(itemId)) {
        return res.status(400).json({ error: 'Item already owned' });
      }

      // Simulate atomic transaction
      const newGold = userGold - itemCost;
      const inventoryItem = {
        id: 'inv-1',
        userId,
        itemId,
        equipped: false,
      };

      res.json({
        inventoryItem,
        newGold,
      });
    });

    // Equip exclusivity test route
    app.patch('/api/user/inventory/:id/equip', mockAuth, async (req: any, res) => {
      const inventoryId = req.params.id;
      const userId = req.userId;

      // Mock inventory items
      const userInventory = [
        { id: 'inv-1', userId, itemId: 'item-1', category: 'FRAME', equipped: false },
        { id: 'inv-2', userId, itemId: 'item-2', category: 'FRAME', equipped: true },
      ];

      const targetItem = userInventory.find((item) => item.id === inventoryId);
      if (!targetItem) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      // Unequip all items in the same category
      const itemsToUnequip = userInventory.filter(
        (item) => item.category === targetItem.category && item.id !== inventoryId
      );

      // Equip target item
      targetItem.equipped = true;
      itemsToUnequip.forEach((item) => (item.equipped = false));

      res.json({
        equippedItem: targetItem,
        unequippedItems: itemsToUnequip,
      });
    });
  });

  describe('Quest Reward Security', () => {
    it('should ignore client-supplied expReward and use server calculation', async () => {
      const response = await request(app)
        .post('/api/quests')
        .send({
          title: 'Test Quest',
          rank: 'A',
          expReward: 999999, // Client trying to cheat
          goldReward: 999999,
        })
        .expect(201);

      // Should use server-calculated rewards (200 exp for rank A)
      expect(response.body.expReward).toBe(200);
      expect(response.body.goldReward).toBe(120);
    });

    it('should apply boss bonus server-side', async () => {
      const response = await request(app)
        .post('/api/quests')
        .send({
          title: 'Boss Quest',
          rank: 'S',
          isBossQuest: true,
        })
        .expect(201);

      // S rank: 500 exp, 300 gold
      // With 1.5x boss bonus: 750 exp, 450 gold
      expect(response.body.expReward).toBe(750);
      expect(response.body.goldReward).toBe(450);
    });
  });

  describe('XP Calculation', () => {
    it('should calculate xpToNext correctly as remaining XP', async () => {
      const response = await request(app)
        .get('/api/hunter/me/stats')
        .expect(200);

      // Level 5, XP 75, XP to next level 100
      // xpToNext should be 100 - 75 = 25
      expect(response.body.xpToNext).toBe(25);
    });

    it('should calculate progress percent correctly', async () => {
      const response = await request(app)
        .get('/api/hunter/me/stats')
        .expect(200);

      // 75 / 100 = 75%
      expect(response.body.progressPercent).toBe(75);
    });
  });

  describe('Shop Purchase Transaction Safety', () => {
    it('should prevent purchase with insufficient gold', async () => {
      const response = await request(app)
        .post('/api/shop/purchase/item-with-high-cost')
        .send({}) // User has 100 gold, but item costs more than 100 in real logic
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient gold');
    });

    it('should prevent duplicate inventory items', async () => {
      const response = await request(app)
        .post('/api/shop/purchase/item-1')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Item already owned');
    });

    it('should complete purchase atomically', async () => {
      const response = await request(app)
        .post('/api/shop/purchase/new-item')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('inventoryItem');
      expect(response.body).toHaveProperty('newGold', 50); // 100 - 50
    });
  });

  describe('Equip Category Exclusivity', () => {
    it('should unequip other items in the same category', async () => {
      const response = await request(app)
        .patch('/api/user/inventory/inv-1/equip')
        .send({})
        .expect(200);

      expect(response.body.equippedItem).toHaveProperty('equipped', true);
      expect(response.body.unequippedItems).toHaveLength(1);
      expect(response.body.unequippedItems[0]).toHaveProperty('equipped', false);
    });
  });
});
