-- Add analytics models for event tracking, onboarding funnel, and retention metrics

-- Analytics events table
CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT,
    "sessionId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS "analytics_events_userId_timestamp_idx" ON "analytics_events"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "analytics_events_eventType_timestamp_idx" ON "analytics_events"("eventType", "timestamp");
CREATE INDEX IF NOT EXISTS "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");

-- Onboarding progress table
CREATE TABLE IF NOT EXISTS "onboarding_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "currentStep" TEXT NOT NULL,
    "completedSteps" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create indexes for onboarding_progress
CREATE INDEX IF NOT EXISTS "onboarding_progress_currentStep_idx" ON "onboarding_progress"("currentStep");
CREATE INDEX IF NOT EXISTS "onboarding_progress_completedAt_idx" ON "onboarding_progress"("completedAt");

-- Retention metrics table
CREATE TABLE IF NOT EXISTS "retention_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "day1Active" BOOLEAN NOT NULL DEFAULT 0,
    "day7Active" BOOLEAN NOT NULL DEFAULT 0,
    "day30Active" BOOLEAN NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "avgSessionDuration" REAL NOT NULL DEFAULT 0,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create indexes for retention_metrics
CREATE INDEX IF NOT EXISTS "retention_metrics_userId_idx" ON "retention_metrics"("userId");
CREATE INDEX IF NOT EXISTS "retention_metrics_day1Active_idx" ON "retention_metrics"("day1Active");
CREATE INDEX IF NOT EXISTS "retention_metrics_day7Active_idx" ON "retention_metrics"("day7Active");
CREATE INDEX IF NOT EXISTS "retention_metrics_day30Active_idx" ON "retention_metrics"("day30Active");