-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hunterId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HunterStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "expToNext" INTEGER NOT NULL DEFAULT 100,
    "rank" TEXT NOT NULL DEFAULT 'E',
    "hp" INTEGER NOT NULL DEFAULT 100,
    "hpMax" INTEGER NOT NULL DEFAULT 100,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "statStrength" INTEGER NOT NULL DEFAULT 0,
    "statAgility" INTEGER NOT NULL DEFAULT 0,
    "statIntelligence" INTEGER NOT NULL DEFAULT 0,
    "statEndurance" INTEGER NOT NULL DEFAULT 0,
    "statLuck" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HunterStats_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deadline" DATETIME,
    "notes" TEXT,
    "fk_gate_id" TEXT,
    "isBossQuest" BOOLEAN NOT NULL DEFAULT false,
    "expReward" INTEGER NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quest_fk_gate_id_fkey" FOREIGN KEY ("fk_gate_id") REFERENCES "Gate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quest_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestSubtask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_quest_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    CONSTRAINT "QuestSubtask_fk_quest_id_fkey" FOREIGN KEY ("fk_quest_id") REFERENCES "Quest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "deadline" DATETIME,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gate_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyDungeon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shift" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DailyDungeon_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DungeonTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_dungeon_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "DungeonTask_fk_dungeon_id_fkey" FOREIGN KEY ("fk_dungeon_id") REFERENCES "DailyDungeon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DungeonLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_dungeon_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "cleared" BOOLEAN NOT NULL,
    CONSTRAINT "DungeonLog_fk_dungeon_id_fkey" FOREIGN KEY ("fk_dungeon_id") REFERENCES "DailyDungeon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "costGold" INTEGER NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "fk_item_id" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserInventory_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserInventory_fk_item_id_fkey" FOREIGN KEY ("fk_item_id") REFERENCES "ShopItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_hunterId_key" ON "User"("hunterId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HunterStats_fk_user_id_key" ON "HunterStats"("fk_user_id");
