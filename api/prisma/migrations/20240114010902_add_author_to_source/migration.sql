/*
  Warnings:

  - You are about to drop the column `date` on the `snapshot` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "snapshot_date_idx";

-- AlterTable
ALTER TABLE "snapshot" DROP COLUMN "date",
ADD COLUMN     "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "source" ADD COLUMN     "author_id" INTEGER,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "snapshot_timestamp_idx" ON "snapshot"("timestamp");

-- AddForeignKey
ALTER TABLE "source" ADD CONSTRAINT "source_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
