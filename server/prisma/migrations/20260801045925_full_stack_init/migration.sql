/*
  Warnings:

  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DungeonTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_dungeon_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DungeonTask_fk_dungeon_id_fkey" FOREIGN KEY ("fk_dungeon_id") REFERENCES "DailyDungeon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DungeonTask" ("fk_dungeon_id", "id", "position", "rank", "title") SELECT "fk_dungeon_id", "id", "position", "rank", "title" FROM "DungeonTask";
DROP TABLE "DungeonTask";
ALTER TABLE "new_DungeonTask" RENAME TO "DungeonTask";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hunterId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "displayName", "email", "hunterId", "id") SELECT "avatarUrl", "createdAt", "displayName", "email", "hunterId", "id" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_hunterId_key" ON "User"("hunterId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
