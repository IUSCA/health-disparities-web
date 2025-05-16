/*
  Warnings:

  - You are about to drop the column `is_protected` on the `cohort` table. All the data in the column will be lost.
  - You are about to drop the column `is_published` on the `cohort` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "cohort_visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- AlterTable
ALTER TABLE "cohort" DROP COLUMN "is_protected",
DROP COLUMN "is_published",
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_derivable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visibility" "cohort_visibility" NOT NULL DEFAULT 'PRIVATE';

-- view
CREATE OR REPLACE VIEW "cohort_view" AS
SELECT
  c.id,
  c.name,
  c.description,
  c.query,
  c.metadata,
  c.created_at,
  c.updated_at,
  c.is_temp,
  c.visibility,
  c.is_locked,
  c.is_archived,
  c.is_derivable,
  c.author_username,

  -- participant count instead of array
  COALESCE(cardinality(c.participants), 0) AS "size",

  -- cohort under review
  EXISTS (
    SELECT 1
    FROM cohort_access_request car
    WHERE car.cohort_id = c.id AND car.status IN ('INITIATED', 'PENDING')
  ) AS in_review,

  -- referenced by another cohort
  EXISTS (
    SELECT 1
    FROM cohort c2
    WHERE c2.query->'schema'->>'name' = 'combination'
      AND c2.query->'body'->'cohort_ids' @> to_jsonb(ARRAY[c.id]::uuid[])
      AND c2.is_temp = false
  ) AS is_referenced

FROM cohort c;
