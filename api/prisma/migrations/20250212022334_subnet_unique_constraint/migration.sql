/*
  Warnings:

  - A unique constraint covering the columns `[subnet,api_key_id]` on the table `subnet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "subnet_subnet_api_key_id_key" ON "subnet"("subnet", "api_key_id");
