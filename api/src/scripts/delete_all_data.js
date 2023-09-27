// not quite working.. 

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  let tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication', 'participant']

  // Delete all records from all tables
  await Promise.all(
    tables
      .map((table) => {
        console.log("Deleting from", table)
        prisma[table].deleteMany()
      })
  );
  
  await prisma.$disconnect();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });