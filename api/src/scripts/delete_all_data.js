// not quite working.. 

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  // Delete all records from all tables
  await Promise.all(
    Object.values(prisma._schema.modelMap)
      .map((model) => {
        console.log("Deleting from", model.name)
        prisma[model.name].deleteMany()
      })
  );
  
  await prisma.$disconnect();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });