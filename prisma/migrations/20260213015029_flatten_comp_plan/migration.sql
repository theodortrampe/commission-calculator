/*
  Warnings:

  - You are about to drop the `comp_plan_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `planVersionId` on the `ramp_steps` table. All the data in the column will be lost.
  - You are about to drop the column `planVersionId` on the `user_period_data` table. All the data in the column will be lost.
  - Added the required column `planId` to the `ramp_steps` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "comp_plan_versions";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_comp_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "description" TEXT,
    "baseRateMultiplier" REAL NOT NULL DEFAULT 1.0,
    "quota" REAL NOT NULL DEFAULT 0.0,
    "acceleratorsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kickersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "accelerators" JSONB,
    "kickers" JSONB,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "comp_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_comp_plans" ("description", "frequency", "id", "name", "organizationId") SELECT "description", "frequency", "id", "name", "organizationId" FROM "comp_plans";
DROP TABLE "comp_plans";
ALTER TABLE "new_comp_plans" RENAME TO "comp_plans";
CREATE INDEX "comp_plans_organizationId_idx" ON "comp_plans"("organizationId");
CREATE TABLE "new_ramp_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "quotaPercentage" REAL NOT NULL,
    "guaranteedDraw" DECIMAL,
    "drawType" TEXT NOT NULL DEFAULT 'NON_RECOVERABLE',
    "disableAccelerators" BOOLEAN NOT NULL DEFAULT true,
    "disableKickers" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ramp_steps_planId_fkey" FOREIGN KEY ("planId") REFERENCES "comp_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ramp_steps" ("disableAccelerators", "disableKickers", "drawType", "guaranteedDraw", "id", "monthIndex", "quotaPercentage") SELECT "disableAccelerators", "disableKickers", "drawType", "guaranteedDraw", "id", "monthIndex", "quotaPercentage" FROM "ramp_steps";
DROP TABLE "ramp_steps";
ALTER TABLE "new_ramp_steps" RENAME TO "ramp_steps";
CREATE UNIQUE INDEX "ramp_steps_planId_monthIndex_key" ON "ramp_steps"("planId", "monthIndex");
CREATE TABLE "new_user_period_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "title" TEXT,
    "quota" REAL NOT NULL,
    "baseSalary" REAL NOT NULL,
    "ote" REAL NOT NULL,
    "effectiveRate" REAL NOT NULL,
    "planId" TEXT,
    CONSTRAINT "user_period_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_period_data_planId_fkey" FOREIGN KEY ("planId") REFERENCES "comp_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_period_data" ("baseSalary", "effectiveRate", "id", "month", "ote", "quota", "title", "userId") SELECT "baseSalary", "effectiveRate", "id", "month", "ote", "quota", "title", "userId" FROM "user_period_data";
DROP TABLE "user_period_data";
ALTER TABLE "new_user_period_data" RENAME TO "user_period_data";
CREATE UNIQUE INDEX "user_period_data_userId_month_key" ON "user_period_data"("userId", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
