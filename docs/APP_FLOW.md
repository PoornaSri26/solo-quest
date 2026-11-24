# APP_FLOW --- Solo Quest

## Screens
Landing, Auth, Onboarding, Dashboard, Quest Log, Gates, Shadow Realm, Shop, Hunter Profile, Milestones, Mastery, Mementos, Knowledge, Social, Progression, Subscription, Admin.

## Main journey
Landing → Auth → Onboarding → Dashboard → (Quest Log / Gates / Shop / Profile) → rewards → level up.

## States
Loading (spinners), Empty (no quests), Success (toast), Error (retry).

## Access
Public: Landing, Auth. Protected: all others. Admin: role-gated.
