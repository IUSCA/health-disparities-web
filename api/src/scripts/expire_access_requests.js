require('module-alias/register');
const { PrismaClient } = require('@prisma/client');

const _ = require('lodash/fp');

const logger = require('../services/logger');
const accessRequestsService = require('../services/access_requests');
const userService = require('../services/user');

const prisma = new PrismaClient();
const { fsm } = accessRequestsService;

const BATCH_SIZE = 10;

async function expireApprovedRequests() {
  const systemUser = await userService.getSystemUser();
  const requestsToExpire = await prisma.cohort_access_request.findMany({
    where: {
      status: 'APPROVED',
      expires_at: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      version: true,
    },
  });

  const totalRequests = requestsToExpire.length;
  let successfulCount = 0;
  let failedCount = 0;

  logger.info(`Found ${totalRequests} requests to expire.`);

  const batches = _.chunk(BATCH_SIZE)(requestsToExpire);

  // eslint-disable-next-line no-restricted-syntax
  for (const batch of batches) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const results = await Promise.allSettled(
        batch.map(async ({ id, version }) => {
          await accessRequestsService.update({
            identifiers: { id },
            updates: {
              status: 'EXPIRED',
              decision_date: new Date(),
            },
            context: {
              user: systemUser,
              reason: 'EXPIRED',
              version,
              source: fsm.Roles.SYSTEM,
            },
          });
        }),
      );

      // eslint-disable-next-line no-loop-func
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulCount += 1;
          logger.info(`Successfully expired request ID: ${batch[index].id}`);
        } else {
          failedCount += 1;
          logger.error(`Failed to expire request ID: ${batch[index].id}, Error: ${result.reason}`);
        }
      });
    } catch (error) {
      logger.error(`Error processing batch: ${error.message}`);
    }
  }

  logger.info(
    `Expiration process completed. Total: ${totalRequests}, Successful: ${successfulCount}, Failed: ${failedCount}`,
  );
}

async function main() {
  try {
    await expireApprovedRequests();
    logger.info('Run completed successfully.');
  } catch (error) {
    logger.error(`Error expiring approved requests: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  expireApprovedRequests,
};

if (require.main === module) {
  main();
}
