-- Add user role column for RBAC (superadmin platform control)
-- Valid values enforced at application layer: 'USER', 'SUPERADMIN'
-- Note: the users table here is "User" (pre-@@map naming in this database).

ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- Index for role-based queries (listing all superadmins, filtering by role)
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "User"("role");
