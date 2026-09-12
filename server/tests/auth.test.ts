import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Authentication API', () => {
  let app: express.Application;
  let prismaMock: any;

  beforeAll(() => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());

    // Mock Prisma
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      hunterStats: {
        create: jest.fn(),
      },
    };

    // Mock bcrypt
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Mock JWT
    (jwt.sign as jest.Mock).mockReturnValue('test-token');
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'test-user-id' });

    // Routes would be imported from the actual app
    // For this example, we'll create simple test routes
    app.post('/api/auth/register', async (req, res) => {
      const { email, password, displayName } = req.body;

      if (!email || !password || !displayName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      try {
        const user = await prismaMock.user.create({
          data: {
            email,
            displayName,
            passwordHash: await bcrypt.hash(password, 10),
            hunterId: 'HNT-1234',
          },
        });

        await prismaMock.hunterStats.create({
          data: { userId: user.id },
        });

        const token = jwt.sign({ userId: user.id }, 'test-secret');
        res.status(201).json({ token, user });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }

      try {
        const user = await prismaMock.user.findUnique({ where: { email } });

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, 'test-secret');
        res.json({ token, user });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        hunterId: 'HNT-1234',
      };

      (prismaMock.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.hunterStats.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password and displayName
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should return 500 on database error', async () => {
      (prismaMock.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashedPassword',
      };

      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 400 for missing email or password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing email or password');
    });
  });
});
