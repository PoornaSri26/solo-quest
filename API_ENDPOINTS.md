# Solo Quest API Endpoints

## Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

## Hunter
- `GET /api/hunter/me` - Get current hunter profile
- `PATCH /api/hunter/me` - Update hunter profile
- `POST /api/hunter/class` - Set hunter class
- `POST /api/hunter/check-in` - Daily check-in
- `POST /api/hunter/streak-ward` - Use streak ward

## Quests
- `GET /api/quests` - Get all quests
- `POST /api/quests` - Create new quest
- `PATCH /api/quests/:id` - Update quest
- `DELETE /api/quests/:id` - Delete quest
- `GET /api/quests/suggested` - Get suggested quests
- `POST /api/quests/:id/snooze` - Snooze quest
- `POST /api/quests/:id/reflection` - Add quest reflection
- `GET /api/quests/:id/flavor` - Get quest flavor text
- `POST /api/quests/:id/decision` - Make quest decision
- `GET /api/quests/:id/decisions` - Get quest decisions
- `POST /api/quests/:id/recover` - Recover failed quest
- `POST /api/quests/:id/complete-tiered` - Complete tiered quest
- `GET /api/quests/summary` - Get quest summary

## Quest Subtasks
- `POST /api/quests/:questId/subtasks` - Create subtask
- `PATCH /api/quests/:questId/subtasks/:id` - Update subtask
- `DELETE /api/quests/:questId/subtasks/:id` - Delete subtask

## Gates
- `GET /api/gates` - Get all gates
- `POST /api/gates` - Create gate
- `PATCH /api/gates/:id` - Update gate
- `DELETE /api/gates/:id` - Delete gate

## Dungeon
- `GET /api/dungeon` - Get daily dungeon
- `POST /api/dungeon/tasks` - Create dungeon task
- `PATCH /api/dungeon/tasks/:id/toggle` - Toggle dungeon task
- `DELETE /api/dungeon/tasks/:id` - Delete dungeon task
- `POST /api/dungeon/complete` - Complete dungeon

## Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read

## Shop
- `GET /api/shop` - Get shop items
- `POST /api/shop/purchase/:itemId` - Purchase item

## Inventory
- `GET /api/user/inventory` - Get user inventory
- `PATCH /api/user/inventory/:id/equip` - Equip inventory item

## Stats
- `GET /api/stats/weekly` - Get weekly stats

## Milestones
- `GET /api/milestones` - Get milestones
- `GET /api/milestones/progress` - Get milestone progress
- `POST /api/milestones/:id/complete` - Complete milestone
- `POST /api/milestones` - Create milestone
- `PATCH /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone

## Mastery Challenges
- `GET /api/mastery-challenges` - Get mastery challenges
- `GET /api/mastery-challenges/progress` - Get mastery progress
- `POST /api/mastery-challenges` - Create mastery challenge
- `PATCH /api/mastery-challenges/:id` - Update mastery challenge
- `DELETE /api/mastery-challenges/:id` - Delete mastery challenge
- `POST /api/mastery-challenges/:id/attempt` - Attempt mastery challenge

## Mementos
- `GET /api/mementos` - Get all mementos
- `GET /api/mementos/user` - Get user mementos
- `POST /api/mementos` - Create memento
- `PATCH /api/mementos/:id` - Update memento
- `DELETE /api/mementos/:id` - Delete memento

## Knowledge
- `GET /api/knowledge` - Get knowledge entries
- `PATCH /api/knowledge` - Update knowledge
- `POST /api/knowledge` - Create knowledge entry
- `DELETE /api/knowledge` - Delete knowledge

## Social
- `GET /api/social/stats` - Get social stats
- `PATCH /api/social/stats` - Update social stats
- `POST /api/social/stats` - Create social stats
- `DELETE /api/social/stats` - Delete social stats
- `GET /api/leaderboard` - Get leaderboard

## Progression
- `GET /api/progression/endpoint` - Get progression endpoint
- `POST /api/progression/complete-chapter` - Complete chapter

## Resources
- `POST /api/resources/use` - Use resource
- `GET /api/resources/usage` - Get resource usage

## Subscription
- `GET /api/subscription/plans` - Get subscription plans
- `GET /api/subscription` - Get user subscription
- `POST /api/subscription/checkout` - Create checkout session
- `POST /api/subscription/cancel` - Cancel subscription
- `GET /api/subscription/success` - Subscription success page
- `GET /api/subscription/canceled` - Subscription canceled page
- `POST /api/subscription/webhook` - Stripe webhook

## Entitlements
- `GET /api/entitlements` - Get user entitlements
- `GET /api/entitlements/check/:action` - Check specific entitlement

## Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update user settings

## Account
- `GET /api/account/export` - Export account data
- `DELETE /api/account` - Delete account

## System
- `GET /health` - Health check
- `GET /api/health` - API health check
- `GET /metrics` - Prometheus metrics
- `POST /api/push/register` - Register push notification token

## Organization (Enterprise)
- `POST /api/organizations` - Create organization
- `POST /api/organizations/:id/whitelabel` - Set whitelabel
- `GET /api/organizations/:id/whitelabel` - Get whitelabel
- `POST /api/organizations/:id/api-keys` - Create API key
- `GET /api/organizations/:id/api-keys` - Get API keys

## Guilds (if enabled)
- `GET /api/guilds` - List guilds
- `POST /api/guilds` - Create guild
- `POST /api/guilds/:id/join` - Join guild
- `GET /api/guilds/:id/raids` - Get guild raids

## Raids (if enabled)
- `POST /api/raids` - Create raid
- `POST /api/raids/:id/join` - Join raid
- `POST /api/raids/:id/contribute` - Contribute to raid

## Marketplace (if enabled)
- `POST /api/marketplace/quest-packs` - Create quest pack
- `POST /api/marketplace/quest-packs/:id/purchase` - Purchase quest pack

## Admin
- (Admin routes handled by SuperadminGuard)
