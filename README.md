# Solo Quest 🎮

**Transform your productivity into an epic RPG adventure**

Solo Quest is a gamified productivity application that turns your daily tasks into quests, your goals into raids, and your personal growth into character progression. Inspired by the concept of gamified self-improvement, this app brings the thrill of RPG progression to your real-life achievements.

[![CI](https://github.com/PoornaSri26/solo-quest/actions/workflows/ci.yml/badge.svg)](https://github.com/PoornaSri26/solo-quest/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)

## 📖 Documentation

|| Doc | Purpose |
|---|---|
| [Contributing](./CONTRIBUTING.md) | How to set up, code style, PR process |
| [Code of Conduct](./CODE_OF_CONDUCT.md) | Community standards |
| [Security Policy](./SECURITY.md) | Responsible disclosure process |
| [Changelog](./CHANGELOG.md) | Release history |
| [Privacy Policy](./PRIVACY.md) | Data collection & your rights (GDPR/CCPA) |
| [Terms of Service](./TERMS_OF_SERVICE.md) | Usage terms, IP notes |
| [Deployment](./DEPLOYMENT.md) | Production, Kubernetes, Docker |
| [Mobile](./MOBILE.md) | iOS/Android via Capacitor |
| [Design](./DESIGN.md) | UI/UX design system |

## ✨ Features

### 🎯 Core Gameplay
- **Quest System**: Create and manage quests with different ranks (E, D, C, B, A, S)
- **Daily Dungeons**: Complete daily challenges to maintain streaks and earn rewards
- **Gate Raids**: Group multiple quests into gates for epic challenges
- **Shadow Realm**: Track failed quests and learn from mistakes
- **Rank Progression**: Level up your hunter character through experience points

### 🏆 Game Economy
- **Reward System**: Earn XP and gold based on quest difficulty
- **Shop System**: Purchase cosmetics, themes, and power-ups
- **Streak Bonuses**: Maintain daily activity for bonus rewards
- **Leaderboards**: Compete with other hunters on global rankings

### 📱 Mobile Support
- **Capacitor Wrapper**: Native iOS and Android apps
- **PWA**: Installable on desktop & Android with offline service worker
- **Responsive Design**: Works seamlessly on all devices
- **Push Notifications**: Quest reminders and achievement alerts

### 🔐 Data Ownership
- **Data Export**: Download a full JSON copy of your data anytime (Hunter Profile → Account & Data)
- **Account Deletion**: One-click account deletion with PII anonymization
- **Privacy-first**: See the [Privacy Policy](./PRIVACY.md) for the full story

### ⚡ Real-Time Features
- **Live Updates**: Real-time stat updates via WebSocket
- **Notifications**: Instant feedback on quest completion and rewards
- **Multiplayer Elements**: See how other hunters are performing

### 🔒 Enterprise-Grade Infrastructure
- **Scalable Architecture**: Kubernetes-ready deployment
- **High Performance**: Redis caching, database optimization, API pagination
- **Security**: CSRF protection, rate limiting, server-side validation
- **Monitoring**: Structured logging, health checks, metrics
- **Reliability**: Transaction-safe operations, graceful degradation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (production) or SQLite (development)
- Redis (optional, for enhanced performance)

### Installation

```bash
# Clone the repository
git clone https://github.com/PoornaSri26/solo-quest.git
cd solo-quest

# Install dependencies
npm install
cd server && npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Initialize database
cd server
npx prisma generate
npx prisma migrate dev

# Start development servers
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd .. && npm run dev
```

### Docker Deployment

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment guides including:
- Kubernetes deployment
- PostgreSQL migration
- Redis configuration
- Environment setup
- Monitoring and scaling

### Mobile Deployment

See [MOBILE.md](./MOBILE.md) for mobile app deployment guides including:
- iOS setup with Xcode
- Android setup with Android Studio
- Capacitor configuration
- Native build process

## 📁 Project Structure

```
solo-quest/
├── src/                      # Frontend React application
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── sections/           # Feature sections
│   ├── lib/                # Utilities and API clients
│   ├── store/              # Zustand state management
│   └── shared/             # Shared types and logic
├── server/                  # Backend Express application
│   ├── src/                # Source code
│   │   ├── cache.ts        # Redis caching layer
│   │   ├── csrf.ts         # CSRF protection
│   │   ├── env.ts          # Environment validation
│   │   ├── index.ts        # Main application
│   │   ├── logger.ts       # Winston logging
│   │   └── rateLimiter.ts # Rate limiting
│   ├── prisma/             # Database schema and migrations
│   ├── tests/              # Test suite
│   └── Dockerfile          # Backend container
├── k8s/                    # Kubernetes manifests
├── docker-compose.yml      # Local development stack
└── nginx.conf             # Reverse proxy configuration
```

## 🧪 Testing

```bash
# Run backend tests
cd server
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:
- Authentication endpoints
- Quest CRUD operations
- Business logic security
- Pagination functionality
- Rate limiting

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/soloquest"
JWT_SECRET="your-secure-jwt-secret-at-least-16-characters"
REDIS_URL="redis://localhost:6379"
PORT=5000
LOG_LEVEL="info"
NODE_ENV="production"
```

### Rate Limiting

Configure rate limits in `server/src/rateLimiter.ts`:
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per minute
- Quest creation: 10 requests per minute
- Shop purchases: 10 requests per minute

### Caching

Configure cache TTL in `server/src/cache.ts`:
- Default TTL: 5 minutes
- Quest lists: 1 minute
- User data: 2 minutes
- Shop items: 10 minutes

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:5000/health
```

Response includes:
- Database connection status
- Redis connection status
- Cache statistics
- Service uptime

### Logging

Logs are structured JSON with the following levels:
- `error`: Critical errors requiring immediate attention
- `warn`: Warning messages for potential issues
- `info`: General informational messages
- `debug`: Detailed debugging information

Logs are rotated daily and retained for 30 days.

## 🔒 Security

Found a vulnerability? **Please don't open a public issue** — see [SECURITY.md](./SECURITY.md) for our disclosure process.

### Implemented Security Measures

- **Server-side validation**: All game economy calculations done server-side
- **CSRF protection**: Origin/Referer header validation
- **Rate limiting**: Redis-backed with memory fallback
- **Input validation**: Zod schema validation
- **SQL injection prevention**: Prisma ORM with parameterized queries
- **XSS protection**: Helmet.js security headers
- **Authentication**: JWT with secure secret management

### Best Practices

- Never commit `.env` files or secrets
- Use strong JWT secrets (minimum 16 characters)
- Enable HTTPS in production
- Regularly update dependencies
- Monitor for security vulnerabilities

## 🌐 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "Hunter Name"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Quests

```bash
# Get paginated quests
GET /api/quests?page=1&limit=20&status=ACTIVE

# Create quest
POST /api/quests
{
  "title": "Complete project",
  "rank": "A",
  "category": "Combat",
  "deadline": "2024-12-31T23:59:59Z"
}

# Update quest
PATCH /api/quests/:id
{
  "status": "COMPLETED"
}
```

### WebSocket Events

- `stats:updated`: Real-time stat updates
- `quest:created`: New quest notification
- `quest:updated`: Quest status change
- `level:up`: Level up event
- `dungeon:cleared`: Daily dungeon completion

## 🎨 Customization

### Game Balance

Modify reward tables in `server/src/index.ts`:

```typescript
const rankRewards = {
  E: { exp: 10, gold: 5 },
  D: { exp: 25, gold: 15 },
  C: { exp: 50, gold: 30 },
  B: { exp: 100, gold: 60 },
  A: { exp: 200, gold: 120 },
  S: { exp: 500, gold: 300 },
};
```

### UI Theming

Customize colors and styles in `src/index.css` and `tailwind.config.cjs`.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for setup instructions, code style, and the PR process — and note our [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💰 Monetization

Solo Quest offers multiple subscription tiers and commercial options.

### Subscription Tiers

- **Free**: Basic quest management, daily dungeons, core features
- **Hunter Pass ($9.99/month)**: Advanced analytics, unlimited quests, custom themes, priority support
- **Enterprise**: Custom solutions, white-label options, dedicated support

### Licensing Options

- **Personal Use**: Free for individual users
- **Small Business**: Contact for pricing
- **Enterprise**: Custom solutions available
- **White Label**: Fully branded solutions

For licensing inquiries, custom development, or enterprise features, please contact:

**Email**: poornasri.n24@gmail.com

## 📞 Support

For support, feature requests, or bug reports:
- Open an issue on GitHub
- Email: poornasri.n24@gmail.com
- Security vulnerabilities: see [SECURITY.md](./SECURITY.md) (do not open public issues)

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Core quest system
- [x] Daily dungeons
- [x] Game economy
- [x] Basic UI

### Phase 2: Scalability ✅
- [x] Docker deployment
- [x] Kubernetes manifests
- [x] Redis caching
- [x] Comprehensive testing

### Phase 3: Enhancement (Current)
- [x] Mobile app wrapper (Capacitor)
- [x] Configurable failure penalties
- [x] Simple Mode onboarding
- [x] Monetization infrastructure
- [x] Social features
- [x] Advanced analytics
- [ ] Additional content and themes

### 🗺️ Phase 4: Expansion
- [ ] Multiplayer raids
- [ ] Guild system
- [ ] Marketplace
- [ ] API for third-party integrations

### 📋 Data & Compliance
- [x] Data export endpoint (`GET /api/account/export`)
- [x] Account deletion with PII anonymization (`DELETE /api/account`)
- [x] Privacy Policy & Terms of Service
- [ ] OAuth sign-in (Google/Apple/GitHub)
- [ ] Email verification & password reset flows

## 🙏 Acknowledgments

- Built with modern web technologies: React, Express, Prisma, Redis
- UI design inspired by productivity gaming concepts
- Community-driven development approach

## 📈 Performance Metrics

- **Frontend Build**: 2,756 modules, ~40s build time
- **Backend Build**: TypeScript compilation, ~10s build time
- **Test Suite**: 70 tests, 100% pass rate (CI-gated)
- **API Response Time**: < 100ms P99 (with caching)
- **WebSocket Latency**: < 50ms average

---

**Built with ❤️ for productivity enthusiasts**

**Transform your tasks into adventure! 🎮⚔️**