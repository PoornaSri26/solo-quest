# Solo Quest — Improvement Backlog

Working backlog derived from the September 2026 market analysis / improvement report.
Suggestions are numbered as in the report. Items move out of this file (into the
codebase, annotated `(#N)`) as they are implemented.

## ✅ Implemented

| # | Feature | Where |
|---|---------|-------|
| 1 | Animated loot/battle payoff on quest completion | `src/components/LootPopup.tsx` |
| 2 | Adaptive rank suggestion from self-reported energy | `server/src/index.ts` (`suggestRankForEnergy`) |
| 3 | Category-specific stat growth (Strength/Intellect/etc.) | `server/src/index.ts` (`categoryToStat`, `calculateStatGrowth`) |
| 4 | Daily combo/momentum multiplier (caps 1.5x) | `server/src/index.ts` (`calculateComboMultiplier`) |
| 13 | Randomized loot drops (variable-ratio reinforcement) | `server/src/index.ts` (`rollLootDrop`) |
| 21/61 | Streak ward: purchasable streak insurance, consumed on failure | `server/src/index.ts` (`/api/hunter/streak-ward`, `applyFailurePenalty`) |
| 24 | Class/archetype selection during onboarding | `src/pages/OnboardingPage.tsx` |
| 25 | Procedural quest flavor text | `server/src/index.ts` (`generateFlavorText`) |
| 34 | Speedrun bonus for early completion | `server/src/index.ts` (`calculateSpeedrunBonus`) |
| 66 | Failure reflection prompt | `server/src/index.ts` (`/api/quests/:id/reflection`), `src/components/QuestCard.tsx` |
| 73 | Snooze as alternative to binary complete/fail | `server/src/index.ts`, `src/components/QuestCard.tsx` |
| 78 | Energy-aware quest suggestions | `server/src/index.ts`, `src/components/MoodCheckIn.tsx` |
| 87 | Quest of the Day (curated suggestion) | `server/src/index.ts` |
| 183 | Idempotent quest completion (race-safe claim) + DB-level purchase guard | `server/src/index.ts` (`updateMany` claim), `schema.prisma` (`@@unique([userId, itemId])`) |
| 452 | Live CI pipeline (build + test on push/PR) | `.github/workflows/ci.yml` |
| 3D-1/5 | R3F + drei 3D layer on existing stack, no new 3D deps | `src/components/HunterAvatar3D.tsx` |
| 3D-9/18 | Avatar config as JSON slots (body/skin/armor/hair/sigil), server-validated + persisted | `src/lib/avatarConfig.ts`, `server/src/index.ts` (settings PATCH), `schema.prisma` (`UserSettings.avatarConfig`) |
| 3D-37 | Rank-tier aura/glow intensifying E → S (cosmetic only, no pay-to-win) | `src/lib/avatarConfig.ts` (`RANK_AURA`) |
| 3D-48/121/123 | Idle breathing animation + class sigil props (stylized, no physics) | `src/components/HunterAvatar3D.tsx` |
| 3D-56/59/85 | Stylized low-poly flat-shaded aesthetic, IP-risk-aware (not SL photorealism) | `src/components/HunterAvatar3D.tsx` |
| 3D-92/109 | frameloop="demand" under reduced motion + contact blob shadows | `src/components/HunterAvatar3D.tsx` |
| 3D-95 | three.js lazy-loaded as a separate chunk; UI shell is 7 kB | `src/components/AvatarCustomizer.tsx`, `src/pages/HunterProfilePage.tsx` |
| 3D-96/256 | "Disable 3D" toggle → 2D DiceBear fallback | `src/components/AvatarCustomizer.tsx` |
| 3D-101/116 | WebGL probe with 2D fallback when context unavailable | `src/components/AvatarCustomizer.tsx` (`hasWebGL`) |
| 3D-257 | Honors `prefers-reduced-motion` (no idle anim, on-demand frames) | `src/components/HunterAvatar3D.tsx` |
| 3D-293 | Strict server-side validation of avatar config payloads (whitelist + hex check) | `server/src/index.ts` (settings PATCH) |
| 3D-301/316 | Landing-hero S-rank hunter showcase (lazy, turntable, 2D fallback) as the marketing hook | `src/components/AvatarHeroShowcase.tsx`, `src/components/Hero.tsx` |
| 3D-26 | One-click "Randomize" look generator (rank never randomized) | `src/lib/avatarConfig.ts` (`randomizeAvatarConfig`), `src/components/AvatarCustomizer.tsx` |
| 3D-27/29 | Curated class-themed preset loadouts (Vanguard/Arcanist/Sage/Shadow/Warden) | `src/lib/avatarConfig.ts` (`AVATAR_PRESETS`), `src/components/AvatarCustomizer.tsx` |

### 3D Avatars & Visuals (3D report §2, items not yet built)
Selfie-to-avatar via MetaPerson/Avatar SDK (3D-3/24), manual creator enhancements — face sliders (#23),
reroll economy (#25), mirror view (#30), dye/recolor masks (#31),
layered accessories (#32-33), expressions (#35), evolution (#41), poses/photo mode (#43-44),
emotes (#134), GLB asset pipeline + Draco/KTX2 (#7/12/13), LOD + instancing for multi-avatar scenes (#88/87/91),
quality-tier auto-detection (#94), context-loss recovery (#102), device-matrix testing (#115/175),
guild-hall 3D scene (#201), hunters' dens (#206), cosmetic shop 3D previews (#176), try-before-buy (#178),
visual regression tests (#276/100), asset budget CI gates (#247/286), avatar a11y text descriptions (#260),
seizure-safe flash limits (#264). *(#301 hero marketing showcase is done — `src/components/AvatarHeroShowcase.tsx`.)*

## 🎯 Next highest-leverage (from report §6)

1. **#367 — Ship a hosted demo** (deploy the existing Docker setup; link in README)
2. **#131–135 — Mobile**: Capacitor projects already exist (`ios/`, `android/`); finish store builds, push notifications, widgets
3. **#96–107 — Real social mechanics**: parties/guilds with shared boss fights (schema tables already exist)
4. **#368/#471 — Reduce Solo Leveling IP dependency**: original lore/visual identity (`src/lib/system-voice.ts` lore is a start)
5. **#153/#166 — Real monetization flow**: Stripe dependency is already installed; wire checkout to the existing `entitlements.ts` tiers
6. **#241 — Test coverage target**: 70 tests today; add coverage gate (e.g. 80%) to CI
7. **#286–295 — Product analytics**: instrument onboarding funnel and D1/D7/D30 retention
8. **#214/#466 — Compliance + repo polish**: privacy policy live, repo description/topics, social preview image

## 📋 Remaining suggestions by category

### Core Gameplay (5–12, 14–20, 22–23, 26–35)
Boss fights on weekly goals (#5), grace/forgiveness tuning (#6), avatar customization (#7),
pet/companion (#8), seasonal events (#9), prestige (#10), custom ranks (#11), quest chains (#12),
crafting (#14), guild hall (#15), story mode (#16), Shadow Realm redemption arcs (#17–18),
rival NPCs (#19), curated quest rotation (#20), personal raid bosses (#22), voice intros (#23),
training-grounds tutorial (#26), equipment durability (#27), quest sponsorship (#28),
tiered achievement badges (#29), hunter log heatmap (#30), mini-games (#31), raid difficulty curves (#32),
mentor system (#33), hunter card profile (#35).

### Onboarding (36–60)
Guided first-quest flow (#36), narrative intro (#37), starter quest templates (#38),
progressive disclosure (#39), tooltip tour (#40), task-import from other apps (#41),
demo party NPCs (#42), welcome sequence (#43), class quiz (#44), avatar preview (#45),
OAuth sign-in (#46), guest mode (#47), onboarding checklist rewards (#48), empty states (#49),
localization (#50), A/B testing (#51), science explainer (#52), goals survey (#53),
jargon tooltips (#54), sample data (#55), session restore (#56), default Daily Dungeon (#57),
"awakening" animation (#58), shareable hunter certificate (#59), D1/D7/D30 KPIs (#60).

### Retention & Habit Design (62–65, 67–86, 88–95)
Smart push timing (#62), re-engagement quest line (#63), weekly recap (#64), habit stacking (#65),
variable reward timing (#67), ethical loss-aversion framing (#68), milestone celebrations (#69),
monthly report cards (#70), social proof nudges (#71), cohort challenges (#72),
grace periods (#74), difficulty ramping (#75), qualitative check-ins (#76), calendar widgets (#77),
adaptive reminders (#79), accountability partners (#80), weekly retrospective quests (#81),
churn prediction (#82), pause-my-journey (#83), habit science tips (#84), copy audit (#85),
commitment devices (#86), custom recurrence (#88), year in review (#89), streak recovery via effort (#90),
habit templates (#91), notification budget (#92), "why am I stuck" diagnostics (#93),
segmented reactivation (#94), public commitment (#95).

### Social & Community (96–130)
Parties/guilds with shared bosses (#96), async co-op (#97), guild chat (#98), referral rewards (#99),
shareable achievement cards (#100), friend-scoped leaderboards (#101), guild tournaments (#102),
mentor pairing (#103), Discord bot (#104), community quest templates (#105), moderation tools (#106),
opt-in party wipe (#107), profile gallery (#108), quest reactions (#109), charity guilds (#110),
accountability check-ins (#111), raid calendar (#112), cross-guild events (#113), family guilds (#114),
workplace guilds (#115), report/block tools (#116), anonymized community stats (#117),
guild shops (#118), hall of fame (#119), partner matchmaking (#120), voice scheduling (#121),
co-created raids (#122), public API/webhooks (#123), content sharing (#124), hunter of the week (#125),
anti-toxicity design (#126), regional leaderboards (#127), event RSVP (#128), identity verification (#129),
feature voting board (#130).

### Mobile (131–150)
Native store builds (#131), PWA fallback (#132), push notifications (#133), home-screen widgets (#134),
watch companions (#135), biometric login (#136), touch-target audit (#137), offline mode (#138),
deep links (#139), mobile onboarding (#140), Tasker/Shortcuts (#141), photo proof (#142),
tablet layout (#143), haptics (#144), system dark mode (#145), cross-device sync QA (#146),
quick-add flow (#147), ASO (#148), widget-based completion (#149), mobile perf budgets (#150).

### Monetization (151–175)
Freemium tier matrix (#151–152), $5/mo subscription (#153), cosmetics-only (#154),
supporter one-time purchase (#155), gifting (#156), battle pass (#157), B2B wellness (#158),
transparent pricing (#159), student discounts (#160), affiliates (#161), willingness-to-pay analytics (#162),
free-tier limits (#163), regional pricing (#164), annual billing (#165), Stripe IAP flow (#166),
premium trials (#167), MRR/churn tracking (#168), pay-what-you-want (#169), self-serve white-label (#170),
creator marketplace (#171), sponsorships (#172), founder's pack (#173), refund policy (#174), cost monitoring (#175).

### Backend & Infrastructure (176–210)
Load testing (#176), query indexing review (#177), WebSocket scaling (#179), migration rollback (#180),
API versioning (#181), OpenAPI docs from code (#182 — swagger-jsdoc already present),
distributed tracing (#184), read replicas (#185), job queue (#186), backup verification (#187),
feature flags (#188), tiered rate limits (#189), Redis circuit breakers (#190), staging env (#191),
connection pooling docs (#192), chaos testing (#193), economy audit logging (#194), HPA autoscaling (#195),
secrets management (#196), schema versioning docs (#197), caching headers (#198), CDN (#199),
WS reconnect/backoff (#200), slow-query monitoring (#201), SLA (#202), multi-region (#203),
dependency scanning (#204), incident runbook (#205), soft deletes (#206 — `deletedAt` exists on User, extend),
API contract tests (#207), memory profiling (#208), env-parity checks (#209), K8s right-sizing (#210).

### Security & Compliance (211–240)
Threat model (#211), 2FA (#212), account recovery docs (#213), GDPR export/erasure (#214),
responsible disclosure (#215), anti-cheat detection (#216), server-side price validation audit (#217),
session rotation (#218), anomaly detection (#219), encryption at rest (#220), CAPTCHA (#221),
data retention policy (#222), pen testing (#223), moderation tooling (#224), age gating (#225),
admin audit trails (#226), CORS docs (#227), license auditing (#228), webhook signatures (#229),
secret scanning (#230), ToS for IP-adjacent branding (#231), rate-limit bypass tests (#232),
DB constraints for economy (#233), DPA template (#234), security headers audit (#235),
email verification for linking (#236), Solo Leveling IP legal review (#237), disclosure timeline (#238),
PII scrubbing in logs (#239), RBAC (#240).

### Testing & QA (241–265)
Coverage targets/gates (#241), E2E tests (#242), property-based economy tests (#243),
WebSocket integration tests (#244), visual regression (#245), load tests (#246), mutation testing (#247),
axe-core a11y tests (#248), schema/API contract tests (#249), timezone edge tests (#250),
cache chaos tests (#251), economy snapshot tests (#252), test data factories (#253),
security regression tests (#254), cross-browser matrix (#255), CI perf budgets (#256),
canary deploys (#257), API fuzzing (#258), coverage badge (#259), migration up/down tests (#260),
manual QA checklists (#261), concurrent-purchase tests (#262), synthetic monitoring (#263),
production-scale test envs (#264), bug triage process (#265).

### Accessibility (266–285)
Keyboard navigation (#266), ARIA audit (#267), colorblind-safe rank palettes (#268),
reduced-motion settings (#269), 200% zoom (#270), alt text (#271), captions (#272),
high-contrast theme (#273), focus-visible (#274), plain-language mode (#275), assistive input (#276),
gender-neutral avatars (#277), cognitive-accessibility mode (#278), locale formatting (#279),
dyslexia font (#280), accessible errors (#281), screen-reader-tested onboarding (#282),
inclusive language review (#283), captions for bot voice (#284), accessibility statement (#285).

### Analytics & AI (286–315)
Product analytics pipeline (#286), cohort dashboards (#287), AI quest suggestions (#288),
AI flavor text (#289), personal insights dashboard (#290), churn scoring (#291),
economy anomaly detection (#292), A/B testing infra (#293), onboarding funnels (#294),
natural-language quest creation (#295), AI difficulty calibration (#296), sentiment analysis (#297),
shop recommendations (#298), data export (#299), experimentation framework (#300),
AI companion NPC (#301), feature heatmaps (#302), percentile benchmarking (#303), insight emails (#304),
custom metrics (#305), data warehouse (#306), explainable AI (#307), privacy-preserving analytics (#308),
ops dashboards (#309), survey-to-backlog loop (#310), best-time predictions (#311),
auto-categorization (#312), research partnerships (#313), cost-per-user dashboards (#314), research consent (#315).

### Content & Localization (316–340)
Multi-language UI (#316), regional templates (#317), template marketplace (#318), seasonal cosmetics (#319),
alternate themes (#320), avatar diversity (#321), RTL support (#322), currency localization (#323),
style guide (#324), crowd translation (#325), persona presets (#326), notification personalities (#327),
content calendar (#328), regional compliance (#329), real-world rewards (#330), icon libraries (#331),
branded content (#332), voice packs (#333), content filters (#334), regional leaderboards (#335),
non-SL aesthetics (#336), profession quest packs (#337), calendar integration (#338), custom themes (#339),
featured hunter stories (#340).

### Docs & DX (341–365)
ADRs (#343), public changelog (#344), JSDoc for economy logic (#345), roadmap board (#346),
good-first-issues (#347), API SDKs (#348), troubleshooting guide (#349), generated docs (#350),
Storybook (#351), contributor onboarding (#352), ER diagrams (#353), status page (#354),
semver releases (#355), API changelog (#356), security.txt (#357), env var docs (#358), FAQ (#359),
glossary (#360), support matrix (#361), brand kit (#362), data model docs (#363), videos (#364),
known issues (#365). *(CONTRIBUTING.md and CODE_OF_CONDUCT.md already exist.)*

### Growth & Marketing (366–400)
Repo description/topics (#366, #451), hosted demo (#367), original branding (#368),
niche-first positioning (#369/#500), content marketing (#370), viral share hooks (#371),
creator affiliates (#372), app store presence (#373), Product Hunt launch (#374), public roadmap (#375),
referral program (#376), testimonials (#377), Discord community (#378), pre-launch newsletter (#379),
coach partnerships (#380), comparison page (#381), press kit (#382), beta program (#383),
SEO landing pages (#384), wall of wins (#385), differentiation messaging (#386), influencer seeding (#387),
student ambassadors (#388), founder story (#389), enterprise collateral (#390), review prompts (#391),
cross-promotions (#392), public metrics (#393), "not for" statement (#394), early-adopter loyalty (#395),
competitive intel process (#396), wellness partnerships (#397), brand voice guide (#398),
feature votes (#399), persona docs (#400).

### UI/UX (401–430)
Original visual identity (#401), micro-interactions (#402), design tokens/Storybook (#403),
theme parity (#404), empty/loading states (#405), sound design (#406), dashboard hierarchy (#407),
progressive UI complexity (#408), customizable layout (#409), non-color rank cues (#410),
onboarding illustrations (#411), constructive Shadow Realm UI (#412), icon audit (#413),
responsive breakpoints (#414), reduced-UI mode (#415), print views (#416), shop redesign (#417),
milestone indicators (#418), notification center (#419), UI density options (#420),
offline feedback (#421), design QA checklist (#422), design handoff docs (#423), user testing (#424),
animation perf guidelines (#425), HUD customization (#426), solo/party visual distinction (#427),
contextual empty CTAs (#428), in-app style guide (#429), purchase-confirm QA (#430).

### Team & Sustainability (431–450)
Second contributor (#431/#10), governance (#432), OSS/commercial license clarity (#433),
funding plan (#434), release cadence (#435), triage cadence (#436), user advisory input (#437),
IP legal review (#438), economy decision log (#439), support process (#440), maintainer pacing (#441),
versioned roadmap comms (#442), beta agreements (#443), success metrics (#444),
quarterly retros (#445), incident escalation (#446), legal checklist (#447), investor dashboards (#448),
definition of done (#449), security audits (#450).

### Quick Wins (451–470)
Repo topics/description (#451 — done via #452's CI, topic config remains on GitHub),
live CI badge (#452 ✅), screenshots/GIF (#453), demo link (#454), LICENSE/commercial cross-check (#455),
CONTRIBUTING.md (#456 ✅ — already existed), README TOC (#457), Discord placeholder (#458),
engines pinning (#459), .env.example audit (#460), coverage badge (#461), uptime badge (#462),
support SLA (#463), monetization copy (#464), star CTA (#465), OG image (#466), roadmap dates (#467),
RPG pitch paragraph (#468), Try-it-now CTAs (#469), feedback form (#470).

### Ambitious Bets (471–500)
Original IP world (#471), physical merch (#472), VR/AR fitness (#473), wearable integrations (#474),
 efficacy research publishing (#475), education edition (#476), therapist dashboard (#477),
data portability standard (#478), UGC marketplace (#479), hunter academy courses (#480),
family mode (#481), corporate OKR mode (#482), API marketplace (#483), legacy/mentor mode (#484),
task-manager partnerships (#485), JP/KR localization strategy (#486), user research team (#487),
AI companion with memory (#488), public benchmark suite (#489), ethics review process (#490),
creator mode (#491), habit cohort studies (#492), climate impact tie-ins (#493),
voice/smart-home (#494), published portability standard (#495), succession planning (#496),
competitor user interviews (#497), RICE framework (#498), quarterly state-of-product report (#499),
niche-owning positioning (#500).

---

*Maintained by the Solo Quest contributors. Last updated: September 24, 2026.*
