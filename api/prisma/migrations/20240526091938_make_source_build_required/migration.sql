/*
  Warnings:

  - Made the column `build` on table `source` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "source" ALTER COLUMN "build" SET NOT NULL;
