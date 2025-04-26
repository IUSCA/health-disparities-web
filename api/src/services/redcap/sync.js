const config = require('config');
const _ = require('lodash/fp');

const { getOldestPendingRequestDate, updateCohortAccessRequest, transformRecord } = require('./data');
const { getRecords } = require('./redcap');

const BATCH_SIZE = config.get('redcap.polling.update_batch_size');
const INTERVAL_MS = config.get('redcap.polling.interval_seconds') * 1000;

async function processRecords(records, logger) {
  // 1. get all records from redcap that are created or updated after a certain date.
  // 2. transform the records to match the database schema and filter out invalid records.
  // 3. There can be multiple records with the same request_id.
  // This can happen if the user opens the form multiple times and submit more than once.
  // If the governance teams flags the record as CANCELED, the record should be ignored.
  // keep the most recent record for each request_id.
  // If all records with the same request_id have no last_updated_at date, all records should be ignored.
  // 4. update the cohort access request in the database with the transformed records.
  try {
    logger.info(`Processing ${records.length} records`);

    // transformRecord always returns a fulfilled promise
    const results = await Promise.all(records.map(transformRecord));
    const transformedRecords = results
      .filter(([err, txRecord]) => err === null && txRecord != null)
      .map(([, txRecord]) => txRecord);

    const errors = _.zip(records, results)
      // eslint-disable-next-line no-unused-vars
      .filter(([origRecord, [err, txRecord]]) => err != null)
      .map(([orig, [err]]) => ({
        record: orig,
        error: err,
      }));

    logger.info(`Step 1: ${transformedRecords.length}/${records.length} valid records`);
    // logger.info(transformedRecords);

    // filter out PENDING records
    // const validRecords = transformedRecords.filter((record) => record.status !== 'PENDING');
    // logger.info(
    //   `Step 2: ${validRecords.length}/${transformedRecords.length} records that are not PENDING`,
    // );

    /**
     * Processes a list of request records by grouping them by `request_id`,
     * filteres out groups with more than one record and all records have a `null` or `undefined` `last_updated_at`
     * sorts each group by `last_updated_at` in ascending order and selecting the last record from each group - picking
     * the most recent one and returning the resulting records as an array.
     */
    const groupedRecords = _.flow(
      _.groupBy((record) => record.request_id),
      _.omitBy((group) => group.length > 1 && group.every((g) => _.isNil(g.last_updated_at))),
      _.mapValues(_.flow(_.sortBy('last_updated_at'), _.last)),
      _.values,
    )(transformedRecords);

    // add the errors for records that are excluded
    const groupedRecordIdsSet = new Set(groupedRecords.map((record) => record.record_id));
    errors.push(...transformedRecords
      .filter((r) => !groupedRecordIdsSet.has(r.record_id))
      .map((r) => ({
        record: r,
        error: 'Record excluded as it is not the most recent or has null last_updated_at in its group',
      })));

    logger.info(
      `Step 2: ${groupedRecords.length}/${transformedRecords.length} records after grouping by request_id\
 to get the most recent record`,
    );
    // logger.info(groupedRecords);

    // updateCohortAccessRequest always returns a fulfilled promise
    const updatedResults = await Promise.all(groupedRecords.map(updateCohortAccessRequest));

    const [success, failures] = _.flow(
      _.zip(groupedRecords),
      // eslint-disable-next-line no-unused-vars
      _.partition(([record, [error, result]]) => result != null),
    )(updatedResults);

    const updatedRecordsCount = success.length;
    errors.push(...failures.map(([record, [error]]) => ({
      record,
      error,
    })));

    logger.info(`Step 3: ${updatedRecordsCount}/${groupedRecords.length} cohort access requests updated`);

    // console.log('Errors:', errors.map((obj) => obj.error));
    return errors;
  } catch (error) {
    logger.error(`Error handling records: ${error.message}`);
  }
}

async function performSyncWork(logger) {
  // return value is a date object in UTC
  const oldestPendingRequestDate = await getOldestPendingRequestDate();
  logger.info(`Oldest pending request date: ${oldestPendingRequestDate}`);
  if (oldestPendingRequestDate === null) {
    logger.info('No pending records found');
    return;
  }
  // get the date 2 sync cycles before the oldest pending request date
  const startDate = new Date(oldestPendingRequestDate.getTime() - 2 * INTERVAL_MS);
  logger.info(`Start date: ${startDate} to get records from redcap`);

  const records = await getRecords({
    start_date: startDate,
  });
  logger.info(`Fetched ${records.length} records from redcap`);

  const recordBatches = _.chunk(BATCH_SIZE)(records);
  // eslint-disable-next-line no-restricted-syntax
  for (const batch of recordBatches) {
    logger.info(`Processing batch of ${batch.length} records`);
    // processRecords always returns a fulfilled promise
    // eslint-disable-next-line no-await-in-loop
    const errors = await processRecords(batch, logger);
    // eslint-disable-next-line no-restricted-syntax
    for (const error of errors) {
      logger.info(error); // will stringify and write to the log file
    }
  }
}

module.exports = {
  performSyncWork,
  processRecords,
};

// if (require.main === module) {
//   performSyncWork().then(() => {
//     logger.info('Polling completed successfully');
//   }).catch((error) => {
//     logger.error(`Polling failed: ${error.message}`);
//   });
// }
