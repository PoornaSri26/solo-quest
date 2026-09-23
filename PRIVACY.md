# Solo Quest Privacy Policy

**Last updated: September 23, 2026**

Solo Quest ("we", "us", "our") provides a gamified productivity application. This policy explains what data we collect, why, and the rights you have over it. It applies to the Solo Quest web app, API, and mobile wrappers (iOS/Android via Capacitor).

## 1. Data We Collect

### Account data (required)
- **Email address** — used for login and account communication.
- **Display name and hunter ID** — shown in the app and on leaderboards.
- **Password** — stored only as a bcrypt hash; never in plain text.

### Gameplay data
- Quests, gates, daily dungeon tasks, completion history, and failure records ("Shadow Realm").
- Hunter stats: level, XP, rank, gold, streaks, streak wagers, and attributes.
- Shop purchases and inventory items.
- Milestones, mastery challenges, mementos, and knowledge progress.

### Optional data
- **Settings** — UI preferences, timezone, locale, notification preferences.
- **Social stats** — only if you use social features.
- **Payment data** — processed by Stripe. We store subscription status and payment records, but **never your full card details**.

### Automatically collected data
- Server logs (request IDs, timestamps, status codes) retained for 30 days.
- Caching metadata (e.g., Redis keys) used to serve the app quickly.

## 2. How We Use Your Data

- To operate your account and the core game loop (quests, rewards, streaks).
- To provide real-time updates (WebSocket events) and notifications.
- To prevent fraud and abuse of the in-game economy.
- To provide support when you contact us.

We do **not** sell your personal data. We do not use your data for third-party advertising.

## 3. Data Sharing

- **Stripe** processes subscription payments (see [Stripe's privacy policy](https://stripe.com/privacy)).
- We may disclose data if required by law, or to protect the rights and safety of users.

## 4. Your Rights (GDPR / CCPA)

Regardless of where you live, we aim to honor these rights for all users:

- **Access & portability** — Download a full JSON export of your data in-app at **Hunter Profile → Account & Data → Download my data**, or via `GET /api/account/export`.
- **Erasure** — Delete your account in-app at **Hunter Profile → Account & Data → Delete my account**, or via `DELETE /api/account`. This anonymizes your email, display name, and avatar, and revokes your sessions.
- **Correction** — Update your display name and avatar from your profile page.
- **Objection / restriction** — Contact us to restrict processing.

**Note on deleted accounts:** for fraud prevention and financial record-keeping, anonymized economy history (e.g., transaction records) may be retained after deletion. This data can no longer be linked to you.

## 5. Data Retention

| Data | Retention |
|---|---|
| Server logs | 30 days |
| Account data | Until account deletion |
| Anonymized economy records | Retained for fraud prevention after deletion |
| Backups | Rolling, per infrastructure policy |

## 6. Security

We use bcrypt password hashing, JWT authentication, CSRF protection, rate limiting, Helmet security headers, Zod input validation, and Prisma parameterized queries. No system is perfectly secure; we encourage responsible disclosure (see [SECURITY.md](./SECURITY.md)).

## 7. Children's Privacy

Solo Quest is not directed at children under 13, and we do not knowingly collect their personal data. If you believe a child has created an account, contact us and we will remove it.

## 8. Changes to This Policy

We will post updates on this page with a revised "Last updated" date. Significant changes will be announced in-app.

## 9. Contact

- **Privacy requests:** poornasri.n24@gmail.com
- **Security issues:** see [SECURITY.md](./SECURITY.md)
- **Bug reports / features:** [GitHub Issues](https://github.com/PoornaSri26/solo-quest/issues)
