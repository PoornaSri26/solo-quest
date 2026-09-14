import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Solo Quest API',
      version: '1.0.0',
      description: 'API documentation for Solo Quest - A gamified productivity application inspired by Solo Leveling',
      contact: {
        name: 'Solo Quest Team',
        email: 'support@soloquest.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.soloquest.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            displayName: {
              type: 'string',
              description: 'User display name',
            },
            hunterId: {
              type: 'string',
              description: 'Hunter ID',
            },
          },
        },
        Hunter: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Hunter ID',
            },
            displayName: {
              type: 'string',
              description: 'Hunter display name',
            },
            hunterId: {
              type: 'string',
              description: 'Hunter ID',
            },
            avatarUrl: {
              type: 'string',
              description: 'Avatar URL',
            },
          },
        },
        HunterStats: {
          type: 'object',
          properties: {
            level: {
              type: 'integer',
              description: 'Hunter level',
            },
            rank: {
              type: 'string',
              description: 'Hunter rank (E, D, C, B, A, S)',
            },
            xp: {
              type: 'integer',
              description: 'Current XP',
            },
            expToNext: {
              type: 'integer',
              description: 'XP needed for next level',
            },
            progressPercent: {
              type: 'number',
              description: 'Progress percentage',
            },
            gold: {
              type: 'integer',
              description: 'Gold amount',
            },
            statStrength: {
              type: 'integer',
              description: 'Strength stat',
            },
            statAgility: {
              type: 'integer',
              description: 'Agility stat',
            },
            statIntelligence: {
              type: 'integer',
              description: 'Intelligence stat',
            },
            statVitality: {
              type: 'integer',
              description: 'Vitality stat',
            },
            statLuck: {
              type: 'integer',
              description: 'Luck stat',
            },
          },
        },
        Quest: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Quest ID',
            },
            title: {
              type: 'string',
              description: 'Quest title',
            },
            description: {
              type: 'string',
              description: 'Quest description',
            },
            rank: {
              type: 'string',
              enum: ['E', 'D', 'C', 'B', 'A', 'S'],
              description: 'Quest rank',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SHADOW'],
              description: 'Quest status',
            },
            xpReward: {
              type: 'integer',
              description: 'XP reward',
            },
            goldReward: {
              type: 'integer',
              description: 'Gold reward',
            },
            expReward: {
              type: 'integer',
              description: 'Experience reward',
            },
            deadline: {
              type: 'string',
              format: 'date-time',
              description: 'Quest deadline',
            },
          },
        },
        Gate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Gate ID',
            },
            name: {
              type: 'string',
              description: 'Gate name',
            },
            rank: {
              type: 'string',
              enum: ['E', 'D', 'C', 'B', 'A', 'S'],
              description: 'Gate rank',
            },
            location: {
              type: 'string',
              description: 'Gate location',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
              description: 'Gate status',
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Gate start time',
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Gate end time',
            },
          },
        },
        ShopItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Shop item ID',
            },
            name: {
              type: 'string',
              description: 'Item name',
            },
            description: {
              type: 'string',
              description: 'Item description',
            },
            price: {
              type: 'integer',
              description: 'Item price in gold',
            },
            category: {
              type: 'string',
              enum: ['WEAPON', 'ARMOR', 'ACCESSORY', 'CONSUMABLE', 'COSMETIC'],
              description: 'Item category',
            },
            rarity: {
              type: 'string',
              enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'],
              description: 'Item rarity',
            },
          },
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Inventory item ID',
            },
            itemId: {
              type: 'string',
              description: 'Shop item ID',
            },
            equipped: {
              type: 'boolean',
              description: 'Whether item is equipped',
            },
            obtainedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When item was obtained',
            },
          },
        },
        DailyDungeon: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Daily dungeon ID',
            },
            name: {
              type: 'string',
              description: 'Dungeon name',
            },
            shift: {
              type: 'string',
              enum: ['MORNING', 'AFTERNOON', 'EVENING'],
              description: 'Dungeon shift',
            },
            active: {
              type: 'boolean',
              description: 'Whether dungeon is active',
            },
            completed: {
              type: 'boolean',
              description: 'Whether dungeon is completed',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            requestId: {
              type: 'string',
              description: 'Request ID for debugging',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/index.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);