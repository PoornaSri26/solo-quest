-- Guild boss fights (#96), part 2: each quest completion may fuel at most one
-- boss strike (server-verified damage; the flag prevents double-spending the
-- same completion across strikes or bosses).

ALTER TABLE "Quest" ADD COLUMN "bossStrikeUsed" BOOLEAN NOT NULL DEFAULT 0;
