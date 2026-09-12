# System Design for AI-Assisted Development: Solo Quest Edition

A Solo Quest-specific guide to using system design knowledge to build better with AI tools.

---

## The Core Insight

AI coding tools are excellent at implementation but need architectural direction from you. For Solo Quest specifically, understanding the gamified productivity architecture leads to better AI assistance.

Without system design knowledge:
```
You: "Add a new quest feature"
AI: Generic quest model, missing game economy rules, no reward validation
```

With system design knowledge:
```
You: "Add a boss quest feature with:
- Server-side reward calculation based on rank tables
- 1.5x boss multiplier applied after base rewards
- Transaction-safe XP/gold updates
- WebSocket broadcast for level-up events
Show me the Prisma schema changes first, then the API implementation."

AI: Production-quality code that respects game economy rules
```

The difference is architectural context specific to gamified systems.

---

## The Mechanism of Prompting: Solo Quest Specifics

AI models predict the next token based on probability. When you use vague terms for game features, the AI generates generic code. When you use specific game system constraints, you get production-quality gamified code.

### Level 1: Foundation
**Weak Prompt:**
> "The frontend talks to the backend."

**Deconstructed Senior Prompt:**
> "The frontend calls this REST API over **HTTP/2**. The API queries **PostgreSQL with Prisma** using **connection pooling**. WebSocket events use **Socket.IO** with **room-based broadcasting**."

**Why this works:**
- **HTTP/2:** Triggers modern server configs with the Vite frontend
- **Prisma Connection Pooling:** Forces efficient database usage for the SQLite/PostgreSQL hybrid
- **Room-based Broadcasting:** Ensures efficient real-time updates for multiplayer features

### Level 2: Core Concepts
**Weak Prompt:**
> "Make the game fast and reliable."

**Deconstructed Senior Prompt:**
> "Quest API needs **< 100ms P99 latency**. Daily Dungeon requires **99.9% availability** during peak hours. Expect **80% reads (quest lists), 20% writes (quest updates)**."

**Why this works:**
- **P99 Latency:** Signals performance requirements for the quest pagination
- **Read/Write Ratio:** Directs the caching strategy for quest lists vs. individual quest updates

### Level 3: Building Blocks
**Weak Prompt:**
> "Add caching for quests."

**Deconstructed Senior Prompt:**
> "Add Redis caching with the **cache-aside pattern** for quest lists. Use **5-minute TTL** for paginated results. Implement **rate limiting at 100 req/min** for quest creation using **Redis-backed rate limiter**."

**Why this works:**
- **Cache-Aside:** Prevents stale data issues with quest status changes
- **5-minute TTL:** Balances freshness with performance for quest catalogs
- **Redis-backed Rate Limiter:** Handles distributed rate limiting across multiple instances

### Level 4: Data Layer
**Weak Prompt:**
> "Store the quest data."

**Deconstructed Senior Prompt:**
> "Use **Prisma with PostgreSQL**. Add **composite index on (user_id, status, created_at)** for quest lists. Separate **read/write paths** using database connection pool."

**Why this works:**
- **Composite Index:** Optimizes the common "show user's active quests" query
- **Read/Write Paths:** Supports the scaling from local SQLite to production PostgreSQL

### Level 5: Distributed Systems
**Weak Prompt:**
> "Send a notification when a quest completes."

**Deconstructed Senior Prompt:**
> "Publish quest completion events to **Socket.IO rooms**. Make the event handler **idempotent** using **quest completion timestamps**. Implement **at-least-once delivery** with **duplicate detection**."

**Why this works:**
- **Socket.IO Rooms:** Efficiently broadcasts to only the affected user
- **Idempotent:** Prevents double-reward glitches on reconnection
- **Duplicate Detection:** Handles WebSocket reconnection scenarios

### Level 6: Architecture Patterns
**Weak Prompt:**
> "Handle game rewards."

**Deconstructed Senior Prompt:**
> "Use the **transaction pattern** for reward distribution. Implement **compensating transactions** for failed reward operations. Use **Prisma transactions** to ensure atomic XP/gold updates."

**Why this works:**
- **Compensating Transactions:** Ensures failed operations don't corrupt game economy
- **Prisma Transactions:** Guarantees consistency across related database operations

### Level 7: Real-World Designs
**Weak Prompt:**
> "Build the daily dungeon feature."

**Deconstructed Senior Prompt:**
> "Implement a **fan-out on write** architecture for dungeon task updates. Store task state in **Redis Sorted Sets (ZSET)** for O(log N) retrieval. Use **PostgreSQL for persistence** with **daily partitioning**."

**Why this works:**
- **Fan-out on Write:** Commits to fast dungeon state reads during gameplay
- **Redis ZSET:** Enables efficient task ordering and completion tracking
- **Daily Partitioning:** Supports historical dungeon analytics without slowing current gameplay

### Level 8: Senior Thinking
**Weak Prompt:**
> "Add logging."

**Destructured Senior Prompt:**
> "Add **structured Winston logging (JSON)** with **correlation IDs**. Include **request IDs** for WebSocket events. Export **game economy metrics** to **Prometheus**."

**Why this works:**
- **Structured Logging:** Enables debugging of complex game state transitions
- **Correlation IDs:** Traces quest completion through API → database → WebSocket flow
- **Game Economy Metrics:** Monitors gold/XP generation rates for balance tuning

---

## Prompting Framework: CARD for Solo Quest

**C - Context:** What's the game system, what exists, what's the player scale?
**A - Architecture:** What game components, patterns, technologies?
**R - Requirements:** Game balance rules, performance needs, player experience?
**D - Details:** Error handling, edge cases, game state consistency?

### Example - Boss Quest Feature:

```
Context:
- Solo Quest gamified productivity app, 1K active users
- React + Vite frontend, Express + Prisma backend
- Existing quest system with E-S rank rewards

Architecture:
- Quest creation endpoint with server-side reward calculation
- WebSocket events for real-time stat updates
- Redis caching for quest lists

Requirements:
- Boss quests must have 1.5x reward multiplier
- XP calculations must use correct level progression formula
- Rewards must be transaction-safe (no duplicate rewards)
- < 200ms latency for quest creation

Details:
- Use rank-based reward tables (E: 10/5, D: 25/15, etc.)
- Apply boss multiplier after base reward calculation
- Use Prisma transaction for stat updates
- Handle WebSocket reconnection gracefully
- Validate that client cannot override rewards

Implement the boss quest creation endpoint.
```

---

## Validation Checklist

After AI generates code, check:

### For Game APIs
- [ ] Server-side reward calculation (no client control)?
- [ ] Correct rank-based reward tables used?
- [ ] Transaction-safe stat updates?
- [ ] WebSocket events broadcast correctly?
- [ ] Rate limiting on expensive operations?
- [ ] Input validation for game exploits?

### For Database Code
- [ ] Quest queries efficient (no N+1 on subtasks)?
- [ ] Indexes exist for common queries (user_id, status)?
- [ ] Transactions where XP/gold changes?
- [ ] Connection pooling configured?
- [ ] Game state consistency guaranteed?

### For Real-time Features
- [ ] Socket.IO rooms used correctly?
- [ ] Reconnection handling implemented?
- [ ] Duplicate event detection?
- [ ] Heartbeat monitoring for stale connections?
- [ ] Graceful degradation if WebSocket fails?

### For Game Economy
- [ ] No gold/XP duplication possible?
- [ ] Equip category exclusivity enforced?
- [ ] Shop purchases atomic?
- [ ] Streak calculations correct?
- [ ] Daily Dungeon replay prevented?

---

## From Concept to Prompt: Solo Quest Edition

| Concept | Prompt Enhancement |
|---------|-------------------|
| Game rewards | "Server-side calculation using rank tables, ignore client values" |
| Quest pagination | "Paginate quests (20 per page), cache lists for 5 minutes" |
| Real-time updates | "Socket.IO room-based broadcast, include request IDs" |
| Database scaling | "PostgreSQL with composite index on (user_id, status)" |
| Game balance | "Validate all rewards against rank tables on server" |
| Security | "JWT auth on all game mutation endpoints" |
| Performance | "Redis cache for shop items, 10-minute TTL" |
| Consistency | "Use Prisma transaction for XP/gold/item updates" |

---

## Common Prompt Mistakes for Solo Quest

**Too vague:**
❌ "Add a new quest type"

**Missing game rules:**
❌ "Add boss quests" (no mention of reward multiplier or validation)

**No exploit prevention:**
❌ "Create quest endpoint" (what if client sends expReward: 999999?)

**Assuming AI knows game economy:**
❌ "Use the same reward calculation as normal quests" (AI doesn't know the tables)

**Not considering multiplayer:**
❌ "Update user stats" (what about WebSocket broadcast to other clients?)

**No error handling for game state:**
❌ "Complete the quest" (what if database fails after giving rewards?)

---

## Iteration Pattern for Solo Quest

**Round 1: Core functionality**
> "Implement the basic boss quest creation endpoint"

**Round 2: Add game economy validation**
> "Add server-side reward calculation using rank tables, ignore client values"

**Round 3: Add transaction safety**
> "Use Prisma transaction to ensure atomic XP/gold updates"

**Round 4: Add real-time updates**
> "Broadcast stat updates via Socket.IO when quest completes"

**Round 5: Add exploit prevention**
> "Add rate limiting and validation to prevent reward manipulation"

**Round 6: Add tests**
> "Write tests covering reward calculation, transaction safety, and edge cases"

---

## AI as Study Partner for Game Systems

Use AI to learn game system design:

**Explain game patterns:**
> "Explain the trade-offs between client-side and server-side reward calculation"

**Quiz yourself:**
> "Ask me 5 questions about preventing game economy exploits and tell me if I'm right"

**Explore designs:**
> "Show me how the equip category exclusivity should work with Prisma transactions. Walk through an example."

**Practice interviews:**
> "Be a system design interviewer. Ask me to design a daily dungeon feature. Challenge my answers on game balance."

---

## The Path for Solo Quest Development

```
Beginner → Learn game patterns → Can describe quest systems
    ↓
Intermediate → Apply to prompts → Get better game code
    ↓
Senior → Validate output → Catch exploits before production
    ↓
Senior → Design game systems → Guide AI effectively
```

Game system design knowledge compounds. Each concept you learn makes every prompt more effective for building balanced, secure game features.

---

## Quick Reference: Solo Quest Stack

### What to specify in prompts:

| Aspect | Example |
|--------|---------|
| Game rewards | "Server-side calculation, rank tables E:10/5, D:25/15, C:50/30, B:100/60, A:200/120, S:500/300" |
| Quest pagination | "Paginate by 20, cache lists 5 min, include total/hasNext/hasPrev" |
| Real-time | "Socket.IO room broadcast, include request ID, handle reconnection" |
| Auth | "JWT validation on all mutation endpoints" |
| Game balance | "Validate rewards server-side, ignore client values" |
| Scale | "Handle 1000 concurrent players, read-heavy quest lists" |
| Async | "Queue dungeon completion, idempotent stat updates" |
| Monitoring | "Winston structured logs, request IDs, game economy metrics" |

### Red flags in AI output for Solo Quest:

| Issue | Fix |
|-------|-----|
| Client-controlled rewards | Ask "Add server-side reward calculation using rank tables" |
| No transaction safety | Ask "Use Prisma transaction for XP/gold updates" |
| Missing WebSocket broadcast | Ask "Add Socket.IO broadcast for stat updates" |
| No rate limiting | Ask "Add rate limiting to quest creation endpoint" |
| Hardcoded reward values | Ask "Use rank-based reward tables from database" |
| No exploit validation | Ask "Add validation to prevent reward manipulation" |

---

## Solo Quest Specific Examples

### Quest Creation
**Bad:**
> "Create a quest endpoint"

**Good:**
> "Create a quest endpoint with:
- Server-side reward calculation based on rank tables
- Ignore client-supplied expReward/goldReward
- Apply 1.5x multiplier for boss quests
- Use Prisma transaction for stat updates
- Broadcast via Socket.IO room user:{userId}
- Rate limit to 10 req/min
- Validate rank values (E, D, C, B, A, S)"

### Daily Dungeon
**Bad:**
> "Add daily dungeon feature"

**Good:**
> "Add daily dungeon with:
- One completion per calendar day enforcement
- Streak calculation with daily checks
- Reset streak when day is missed
- Transaction-safe XP/gold rewards
- Redis caching for dungeon state
- WebSocket broadcast on completion
- Rate limiting on dungeon reset attempts"

### Shop System
**Bad:**
> "Create shop endpoints"

**Good:**
> "Create shop with:
- Prisma unique constraint on (userId, itemId)
- Transactional gold deduction
- Atomic equip/unequip operations
- Category exclusivity (only one FRAME equipped)
- Server-side cost validation
- Cache shop items for 10 minutes
- Rate limit purchases to 10/min"

---

## Start Here for Solo Quest

1. Review the existing Solo Quest architecture (React + Vite + Express + Prisma)
2. Go through the levels in order, applying to game features
3. Practice prompting with actual Solo Quest features (quests, dungeon, shop)
4. Notice how your prompts get more specific about game systems
5. Notice how AI output gets more secure and balanced

The goal: become the game system architect, let AI be the implementer.

---

## Integration with Current Project

The Solo Quest project already implements many of these patterns:

**Implemented:**
- ✅ Server-side reward calculation
- ✅ Transaction-safe operations
- ✅ WebSocket real-time updates
- ✅ Redis caching layer
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Pagination
- ✅ Structured logging
- ✅ Health checks

**To apply this guide:**
- Use the CARD framework when requesting new features
- Reference the existing patterns when asking for similar features
- Validate AI output against the game economy rules
- Use the iteration pattern for complex features

---

[← Back to Project](README.md)
