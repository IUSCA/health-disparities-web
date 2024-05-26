const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sources = {};

async function fetchSource(id) {
  if (sources[id]) {
    return sources[id];
  }
  const source = await prisma.source.findUniqueOrThrow({
    where: { id },
  });
  sources[id] = source;
  return source;
}

module.exports = {
  fetchSource,
};
