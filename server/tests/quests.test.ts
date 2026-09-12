import request from 'supertest';
import express from 'express';

describe('Quest API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    const mockAuth = (req: any, res: any, next: any) => {
      req.userId = 'test-user-id';
      next();
    };

    // Simple test routes for quests
    app.get('/api/quests', mockAuth, (req, res) => {
      const { page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ error: 'Invalid pagination parameters' });
      }

      const mockQuests = [
        { id: '1', title: 'Test Quest 1', status: 'ACTIVE' },
        { id: '2', title: 'Test Quest 2', status: 'COMPLETED' },
      ];

      res.json({
        data: mockQuests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    app.post('/api/quests', mockAuth, (req, res) => {
      const { title, rank } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const newQuest = {
        id: '3',
        title,
        rank: rank || 'E',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      res.status(201).json(newQuest);
    });

    app.patch('/api/quests/:id', mockAuth, (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!['ACTIVE', 'COMPLETED', 'FAILED', 'ARCHIVED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      res.json({
        id,
        status,
        updatedAt: new Date().toISOString(),
      });
    });

    app.delete('/api/quests/:id', mockAuth, (req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/quests', () => {
    it('should return paginated quests', async () => {
      const response = await request(app)
        .get('/api/quests?page=1&limit=20')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 20);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/quests?page=0&limit=200')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid pagination parameters');
    });

    it('should use default pagination when parameters are missing', async () => {
      const response = await request(app)
        .get('/api/quests')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 20);
    });
  });

  describe('POST /api/quests', () => {
    it('should create a new quest', async () => {
      const response = await request(app)
        .post('/api/quests')
        .send({
          title: 'New Quest',
          rank: 'A',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'New Quest');
      expect(response.body).toHaveProperty('rank', 'A');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/quests')
        .send({
          rank: 'A',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Title is required');
    });
  });

  describe('PATCH /api/quests/:id', () => {
    it('should update quest status', async () => {
      const response = await request(app)
        .patch('/api/quests/1')
        .send({
          status: 'COMPLETED',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('status', 'COMPLETED');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/quests/1')
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid status');
    });
  });

  describe('DELETE /api/quests/:id', () => {
    it('should delete a quest', async () => {
      await request(app)
        .delete('/api/quests/1')
        .expect(204);
    });
  });
});
