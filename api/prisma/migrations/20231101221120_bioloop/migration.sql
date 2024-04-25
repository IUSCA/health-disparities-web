/*
  Warnings:

  - A unique constraint covering the columns `[name,type,is_deleted]` on the table `dataset` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "access_type" AS ENUM ('BROWSER', 'SLATE_SCRATCH');

-- DropForeignKey
ALTER TABLE "contact" DROP CONSTRAINT "contact_user_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_audit" DROP CONSTRAINT "dataset_audit_dataset_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_audit" DROP CONSTRAINT "dataset_audit_user_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_file" DROP CONSTRAINT "dataset_file_dataset_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_file_hierarchy" DROP CONSTRAINT "dataset_file_hierarchy_child_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_file_hierarchy" DROP CONSTRAINT "dataset_file_hierarchy_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_hierarchy" DROP CONSTRAINT "dataset_hierarchy_derived_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_hierarchy" DROP CONSTRAINT "dataset_hierarchy_source_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_state" DROP CONSTRAINT "dataset_state_dataset_id_fkey";

-- DropForeignKey
ALTER TABLE "user_login" DROP CONSTRAINT "user_login_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_password" DROP CONSTRAINT "user_password_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow" DROP CONSTRAINT "workflow_dataset_id_fkey";

-- DropIndex
DROP INDEX "dataset_name_type_key";

-- AlterTable
ALTER TABLE "dataset" 
ADD COLUMN     "bundle_size" BIGINT,
ADD COLUMN     "participant_id" INTEGER;

-- AlterTable
ALTER TABLE "dataset_audit" ALTER COLUMN "dataset_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "data_access_log" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_type" "access_type" NOT NULL,
    "file_id" INTEGER,
    "dataset_id" INTEGER,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "data_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_request_log" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataset_id" INTEGER,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "stage_request_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dataset_name_type_is_deleted_key" ON "dataset"("name", "type", "is_deleted");

-- AddForeignKey
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_hierarchy" ADD CONSTRAINT "dataset_hierarchy_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_hierarchy" ADD CONSTRAINT "dataset_hierarchy_derived_id_fkey" FOREIGN KEY ("derived_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_file" ADD CONSTRAINT "dataset_file_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_file_hierarchy" ADD CONSTRAINT "dataset_file_hierarchy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "dataset_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_file_hierarchy" ADD CONSTRAINT "dataset_file_hierarchy_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "dataset_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_audit" ADD CONSTRAINT "dataset_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_audit" ADD CONSTRAINT "dataset_audit_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_state" ADD CONSTRAINT "dataset_state_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_log" ADD CONSTRAINT "data_access_log_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "dataset_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_log" ADD CONSTRAINT "data_access_log_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_log" ADD CONSTRAINT "data_access_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_request_log" ADD CONSTRAINT "stage_request_log_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_request_log" ADD CONSTRAINT "stage_request_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_password" ADD CONSTRAINT "user_password_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_login" ADD CONSTRAINT "user_login_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
