/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { readUsersFromJSON } = require('../utils');
const { access_request_stage_definitions, scopes } = require('../../prisma/seed_data/data');

global.__basedir = path.join(__dirname, '..', '..');

const prisma = new PrismaClient();

// Create default roles
const roles = [{
  id: 1,
  name: 'admin',
  description: 'Access to the Admin Panel',
},
{
  id: 2,
  name: 'operator',
  description: 'Operator level access',
},
{
  id: 3,
  name: 'user',
  description: 'User level access',
}];

async function update_seq(table) {
  // Get the current maximum value of the id column
  const result = await prisma[table].aggregate({
    _max: {
      id: true,
    },
  });
  const currentMaxId = result?._max?.id || 0;

  // Reset the sequence to the current maximum value
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${currentMaxId + 1}`);
}

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: role,
      update: role,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`created ${roles.length} roles`);

  // Create default admins
  const _admins = [
    {
      name: 'svc_tasks',
      username: 'svc_tasks',
      email: 'svc_tasks@iu.edu',
    },
  ];

  const additional_admins = readUsersFromJSON('admins.json');

  const admins = _admins
    .concat(additional_admins)
    .map((user) => ({
      ...user,
      cas_id: user.username,
      user_role: {
        create: [{ role_id: 1 }],
      },
    }));

  const operators_read = readUsersFromJSON('operators.json');
  const operators = operators_read.map((user) => ({
    ...user,
    cas_id: user.username,
    user_role: {
      create: [{ role_id: 2 }],
    },
  }));

  const users_read = readUsersFromJSON('users.json');
  const users = users_read.map((user) => ({
    ...user,
    cas_id: user.username,
    user_role: {
      create: [{ role_id: 3 }],
    },
  }));

  const all_users = admins
    .concat(operators)
    .concat(users);

  for (const user of all_users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log(`created ${admins.length} administrators`);
  console.log(`created ${operators.length} operators`);
  console.log(`created ${users.length} users`);

  // create access request stage definitions
  for (const ard of access_request_stage_definitions) {
    await prisma.access_request_stage_definition.upsert({
      where: {
        id: ard.id,
      },
      update: {},
      create: ard,
    });
  }

  // create a protocol
  await prisma.protocol.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Default Protocol',
      description: 'This is the default protocol for the system.',
      author_id: 1,
    },
  });

  // add all users to the default protocol
  const db_users = await prisma.user.findMany({
    select: { id: true },
  });
  const all_users_ids = db_users.map((user) => user.id);
  await prisma.user_protocol.createMany({
    data: all_users_ids.map((id) => ({
      user_id: id,
      protocol_id: 1,
    })),
    skipDuplicates: true,
  });

  // create api access key scopes
  for (const scope of scopes) {
    await prisma.scope.upsert({
      where: { id: scope.id },
      update: {},
      create: scope,
    });
  }

  // create snapshot
  await prisma.snapshot.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Initial Snapshot',
      description: 'This is the initial snapshot of the system.',
      author_id: 1,
    },
  });

  // create source
  await prisma.source.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Default Source',
      build: 'hg38',
      description: 'This is the default source for the system.',
      author_id: 1,
    },
  });

  const tables = ['user', 'role', 'scope', 'snapshot', 'source'];
  await Promise.all(tables.map(update_seq));
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
