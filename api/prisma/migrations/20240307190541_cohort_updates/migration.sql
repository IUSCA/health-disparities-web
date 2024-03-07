/*
  Warnings:

  - The primary key for the `cohort` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `strength_dose` column on the `medication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `group_user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "group_user" DROP CONSTRAINT "group_user_group_id_fkey";

-- DropForeignKey
ALTER TABLE "group_user" DROP CONSTRAINT "group_user_user_id_fkey";

-- AlterTable
ALTER TABLE "cohort" DROP CONSTRAINT "cohort_pkey",
ADD COLUMN     "is_temp" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "cohort_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "cohort_id_seq";

-- AlterTable
ALTER TABLE "medication" DROP COLUMN "strength_dose",
ADD COLUMN     "strength_dose" DECIMAL(65,30);

-- DropTable
DROP TABLE "group";

-- DropTable
DROP TABLE "group_user";
