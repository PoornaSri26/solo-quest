-- Add push notification tokens table for managing device push tokens

-- Push tokens table
CREATE TABLE IF NOT EXISTS "push_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create indexes for push_tokens
CREATE INDEX IF NOT EXISTS "push_tokens_userId_idx" ON "push_tokens"("userId");
CREATE INDEX IF NOT EXISTS "push_tokens_platform_idx" ON "push_tokens"("platform");
CREATE INDEX IF NOT EXISTS "push_tokens_isActive_idx" ON "push_tokens"("isActive");

-- Create trigger to update updatedAt
CREATE TRIGGER IF NOT EXISTS "update_push_tokens_updatedAt"
AFTER UPDATE ON "push_tokens"
FOR EACH ROW
BEGIN
    UPDATE "push_tokens" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;