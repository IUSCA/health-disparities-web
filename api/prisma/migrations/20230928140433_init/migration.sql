-- CreateTable
CREATE TABLE "dataset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "num_directories" INTEGER,
    "num_files" INTEGER,
    "du_size" BIGINT,
    "size" BIGINT,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origin_path" TEXT,
    "archive_path" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_staged" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_hierarchy" (
    "source_id" INTEGER NOT NULL,
    "derived_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_hierarchy_pkey" PRIMARY KEY ("source_id","derived_id")
);

-- CreateTable
CREATE TABLE "dataset_file" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "path" TEXT NOT NULL,
    "md5" TEXT,
    "size" BIGINT,
    "filetype" TEXT,
    "metadata" JSONB,
    "status" TEXT,
    "dataset_id" INTEGER NOT NULL,

    CONSTRAINT "dataset_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_file_hierarchy" (
    "parent_id" INTEGER NOT NULL,
    "child_id" INTEGER NOT NULL,

    CONSTRAINT "dataset_file_hierarchy_pkey" PRIMARY KEY ("parent_id","child_id")
);

-- CreateTable
CREATE TABLE "dataset_audit" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "old_data" JSONB,
    "new_data" JSONB,
    "user_id" INTEGER,
    "dataset_id" INTEGER NOT NULL,

    CONSTRAINT "dataset_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_state" (
    "state" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "dataset_id" INTEGER NOT NULL,

    CONSTRAINT "dataset_state_pkey" PRIMARY KEY ("timestamp","dataset_id","state")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(100) NOT NULL,
    "cas_id" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_password" (
    "id" SERIAL NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_password_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_login" (
    "id" SERIAL NOT NULL,
    "last_login" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "user_id" INTEGER,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL DEFAULT '',

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "workflow" (
    "id" TEXT NOT NULL,
    "dataset_id" INTEGER,

    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric" (
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measurement" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "usage" BIGINT,
    "limit" BIGINT,
    "fields" JSONB,
    "tags" JSONB,

    CONSTRAINT "metric_pkey" PRIMARY KEY ("timestamp","measurement","subject")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "browser_enabled" BOOLEAN NOT NULL DEFAULT false,
    "funding" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_user" (
    "project_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_user_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "project_dataset" (
    "project_id" TEXT NOT NULL,
    "dataset_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_dataset_pkey" PRIMARY KEY ("project_id","dataset_id")
);

-- CreateTable
CREATE TABLE "project_contact" (
    "project_id" TEXT NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_contact_pkey" PRIMARY KEY ("project_id","contact_id")
);

-- CreateTable
CREATE TABLE "participant" (
    "id" SERIAL NOT NULL,
    "ib_id" TEXT NOT NULL,
    "study_id" INTEGER NOT NULL,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stats" JSONB NOT NULL,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demographic" (
    "id" SERIAL NOT NULL,
    "gender" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "ethnicity" TEXT,
    "max_enc_date" TIMESTAMP(3) NOT NULL,
    "chs_flag" INTEGER NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "enroll_date" TIMESTAMP(3),
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "demographic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "result" DECIMAL(65,30) NOT NULL,
    "unit" VARCHAR(100) NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "covid_test" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "covid_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "covid_vax" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "series_doses" INTEGER NOT NULL,
    "is_booster" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "covid_vax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dx" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "code_system" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "dx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital" (
    "id" SERIAL NOT NULL,
    "enc_id" TEXT NOT NULL,
    "admit_date" TIMESTAMP(3) NOT NULL,
    "discharge_date" TIMESTAMP(3),
    "dx_code" TEXT NOT NULL,
    "dx_code_system" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "dispense_qty" DECIMAL(65,30),
    "dispense_qty_unit" TEXT,
    "nbr_refills" INTEGER,
    "strength_dose" TEXT,
    "strength_dose_unit" TEXT,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_by" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,

    CONSTRAINT "results_by_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,

    CONSTRAINT "cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_user" (
    "cohort_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "cohort_user_pkey" PRIMARY KEY ("cohort_id","user_id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_user" (
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "group_user_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "cohort_participants" (
    "cohort_id" INTEGER NOT NULL,
    "participant_id" INTEGER NOT NULL,

    CONSTRAINT "cohort_participants_pkey" PRIMARY KEY ("cohort_id","participant_id")
);

-- CreateTable
CREATE TABLE "log" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "worker_process_id" INTEGER NOT NULL,

    CONSTRAINT "log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_process" (
    "id" SERIAL NOT NULL,
    "pid" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "tags" JSONB,
    "start_time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostname" TEXT NOT NULL,

    CONSTRAINT "worker_process_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dataset_name_type_key" ON "dataset"("name", "type");

-- CreateIndex
CREATE INDEX "dataset_file_dataset_id_idx" ON "dataset_file"("dataset_id");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_file_path_dataset_id_key" ON "dataset_file"("path", "dataset_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_cas_id_key" ON "user"("cas_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_password_user_id_key" ON "user_password"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_login_user_id_key" ON "user_login"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_type_value_key" ON "contact"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "project_slug_key" ON "project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "participant_ib_id_study_id_key" ON "participant"("ib_id", "study_id");

-- CreateIndex
CREATE INDEX "log_worker_process_id_idx" ON "log"("worker_process_id");

-- AddForeignKey
ALTER TABLE "dataset_hierarchy" ADD CONSTRAINT "dataset_hierarchy_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_hierarchy" ADD CONSTRAINT "dataset_hierarchy_derived_id_fkey" FOREIGN KEY ("derived_id") REFERENCES "dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_file" ADD CONSTRAINT "dataset_file_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_file_hierarchy" ADD CONSTRAINT "dataset_file_hierarchy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "dataset_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_file_hierarchy" ADD CONSTRAINT "dataset_file_hierarchy_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "dataset_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_audit" ADD CONSTRAINT "dataset_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_audit" ADD CONSTRAINT "dataset_audit_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_state" ADD CONSTRAINT "dataset_state_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_password" ADD CONSTRAINT "user_password_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_login" ADD CONSTRAINT "user_login_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_user" ADD CONSTRAINT "project_user_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_user" ADD CONSTRAINT "project_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dataset" ADD CONSTRAINT "project_dataset_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dataset" ADD CONSTRAINT "project_dataset_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demographic" ADD CONSTRAINT "demographic_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab" ADD CONSTRAINT "lab_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covid_test" ADD CONSTRAINT "covid_test_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covid_vax" ADD CONSTRAINT "covid_vax_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dx" ADD CONSTRAINT "dx_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication" ADD CONSTRAINT "medication_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_user" ADD CONSTRAINT "cohort_user_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cohort_user" ADD CONSTRAINT "cohort_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_user" ADD CONSTRAINT "group_user_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_user" ADD CONSTRAINT "group_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cohort_participants" ADD CONSTRAINT "cohort_participants_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohort"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "log" ADD CONSTRAINT "log_worker_process_id_fkey" FOREIGN KEY ("worker_process_id") REFERENCES "worker_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
