/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Deletes temporary cohorts that are last updated more than 2 hours ago
  const res = await prisma.$executeRaw`
    DELETE FROM cohort
    WHERE 
      "is_temp" = true AND
      "updated_at" < CURRENT_TIMESTAMP - interval '2 hours';
  `;
  console.log(res);
  return res;
}

main()
  .then(() => {
    prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
