/*
  Warnings:

  - You are about to drop the column `guaranteedDraw` on the `ramp_steps` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ramp_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "quotaPercentage" REAL NOT NULL,
    "guaranteedDrawPercent" REAL,
    "drawType" TEXT NOT NULL DEFAULT 'NON_RECOVERABLE',
    "disableAccelerators" BOOLEAN NOT NULL DEFAULT true,
    "disableKickers" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ramp_steps_planId_fkey" FOREIGN KEY ("planId") REFERENCES "comp_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ramp_steps" ("disableAccelerators", "disableKickers", "drawType", "id", "monthIndex", "planId", "quotaPercentage") SELECT "disableAccelerators", "disableKickers", "drawType", "id", "monthIndex", "planId", "quotaPercentage" FROM "ramp_steps";
DROP TABLE "ramp_steps";
ALTER TABLE "new_ramp_steps" RENAME TO "ramp_steps";
CREATE UNIQUE INDEX "ramp_steps_planId_monthIndex_key" ON "ramp_steps"("planId", "monthIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
