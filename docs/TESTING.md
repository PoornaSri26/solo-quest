# TESTING --- Solo Quest

Types: unit, integration, e2e, performance, a11y, security.
Key flows: register → login → create quest → complete → reward → level up; daily dungeon; shop purchase; data export.
Tools: Jest (server), Playwright (e2e), Lighthouse (perf/a11y).
Coverage gate: 80% statements/lines/functions, 70% branches.
Run: cd server && npm test.
