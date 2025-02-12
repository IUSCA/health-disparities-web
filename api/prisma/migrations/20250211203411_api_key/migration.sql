-- CreateTable
CREATE TABLE "api_key" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "secret" BYTEA NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoker_username" TEXT,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subnet" (
    "id" SERIAL NOT NULL,
    "subnet" INET NOT NULL,
    "api_key_id" INTEGER NOT NULL,

    CONSTRAINT "subnet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_scope" (
    "api_key_id" INTEGER NOT NULL,
    "scope_id" INTEGER NOT NULL,

    CONSTRAINT "api_key_scope_pkey" PRIMARY KEY ("api_key_id","scope_id")
);

-- CreateTable
CREATE TABLE "api_audit_log" (
    "id" SERIAL NOT NULL,
    "api_key_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "accessed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "http_method" TEXT NOT NULL,
    "ip_address" INET,
    "status_code" INTEGER,
    "scope_id" INTEGER,
    "response_time" INTEGER,
    "request_body" TEXT,
    "response_body" TEXT,

    CONSTRAINT "api_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_key_key_key" ON "api_key"("key");

-- CreateIndex
CREATE UNIQUE INDEX "scope_name_key" ON "scope"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scope_resource_action_key" ON "scope"("resource", "action");

-- CreateIndex
CREATE INDEX "api_audit_log_api_key_id_idx" ON "api_audit_log"("api_key_id");

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_revoker_username_fkey" FOREIGN KEY ("revoker_username") REFERENCES "user"("username") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subnet" ADD CONSTRAINT "subnet_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_key"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_scope" ADD CONSTRAINT "api_key_scope_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_key"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_scope" ADD CONSTRAINT "api_key_scope_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "scope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_audit_log" ADD CONSTRAINT "api_audit_log_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_key"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_audit_log" ADD CONSTRAINT "api_audit_log_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "scope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
