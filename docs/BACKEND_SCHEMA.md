# BACKEND_SCHEMA --- Solo Quest

See DATA_MODEL.md for full model reference. Key tables: users, hunter_stats, quests, gates, shop_items, economy_ledger, subscriptions. RLS/policies enforced at app layer (Prisma + middleware). Every user-scoped row carries userId with cascade delete. Soft deletes via User.deletedAt.
