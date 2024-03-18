/*
  Warnings:

  - You are about to drop the column `author_id` on the `cohort` table. All the data in the column will be lost.
  - You are about to drop the column `author_id` on the `query_analytics` table. All the data in the column will be lost.
  - Added the required column `author_username` to the `cohort` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author_username` to the `query_analytics` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cohort" DROP CONSTRAINT "cohort_author_id_fkey";

-- DropForeignKey
ALTER TABLE "query_analytics" DROP CONSTRAINT "query_analytics_author_id_fkey";

-- AlterTable
ALTER TABLE "cohort" DROP COLUMN "author_id",
ADD COLUMN     "author_username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "query_analytics" DROP COLUMN "author_id",
ADD COLUMN     "author_username" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "cohort" ADD CONSTRAINT "cohort_author_username_fkey" FOREIGN KEY ("author_username") REFERENCES "user"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_analytics" ADD CONSTRAINT "query_analytics_author_username_fkey" FOREIGN KEY ("author_username") REFERENCES "user"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
