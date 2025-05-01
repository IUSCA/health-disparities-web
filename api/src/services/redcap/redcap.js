const axios = require('axios');
const config = require('config');
const _ = require('lodash/fp');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const client = axios.create({
  baseURL: config.get('redcap.base_url'),
});
const API_TOKEN = config.get('redcap.api_token');

// https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const REDCAP_TIMEZONE = config.get('redcap.timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

function buildRedcapFilterLogic(filters) {
  const _filters = _.omitBy(_.isUndefined, filters);
  if (_.isEmpty(_filters)) {
    return '';
  }
  const conditions = Object.entries(_filters).map(([key, value]) => `[${key}]="${value}"`);
  return conditions.join(' && ');
}

/**
 * Converts a JavaScript Date object (in UTC) to the REDCap server's timezone
 * and formats it as a string in the 'YYYY-MM-DD HH:mm:ss' format.
 *
 * @param {Date} date - The JavaScript Date object in UTC to be converted.
 * @returns {string} - The formatted date string in the REDCap server's timezone.
 *
 * @example
 * const date = new Date('2023-03-15T12:00:00Z'); // UTC time
 * const formattedDate = formatDate(date);
 * console.log(formattedDate); // Outputs: '2023-03-15 08:00:00' (example for a UTC-4 timezone)
 */
function formatDate(date) {
  return dayjs(date)
    .tz(REDCAP_TIMEZONE)
    .format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Get records from REDCap
 *
 * @param {Object} options - The options for fetching records.
 * @param {Object} [options.filters={}] - Filters to apply to the records.
 * @param {Array} [options.select=[]] - Fields to select in the response.
 * @param {Date} [options.start_date=null] - A JavaScript Date object representing the start of the date range in UTC timezone.
 *                                           Records created or modified *after* this datetime will be returned.
 * @param {Date} [options.end_date=null] - A JavaScript Date object representing the end of the date range in UTC timezone.
 *                                         Records created or modified *before* this datetime will be returned.
 * @returns {Promise<Object[]>} - A promise that resolves with the records.
 *
 * @note The `start_date` and `end_date` parameters are converted from UTC to the REDCap server's timezone
 *       before being included in the request.
 */
function getRecords({
  filters = {},
  select = [],
  start_date = null,
  end_date = null,
} = {}) {
  const data = {
    token: API_TOKEN,
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'flat',
    csvDelimiter: '',
    rawOrLabel: 'raw',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'true',
    exportSurveyFields: 'true',
    exportDataAccessGroups: 'true',
    returnFormat: 'json',
    filterLogic: buildRedcapFilterLogic(filters),
  };

  if (select.length) {
    // 'approve_catalog_access_complete, catalog_access_status,
    // catalog_access_revoked, terra_user_id, who_apprv_catalog_access, who_revoked_catalog_access,
    // why_catalog_access_revoked'
    data.fields = select.join(',');
  }

  if (start_date) {
    // convert from UTC to REDCap timezone
    // convert to YYYY-MM-DD HH:MM:SS
    // eslint-disable-next-line prefer-destructuring
    data.dateRangeBegin = formatDate(start_date);
  }

  if (end_date) {
    // convert to YYYY-MM-DD HH:MM:SS
    // eslint-disable-next-line prefer-destructuring
    data.dateRangeEnd = formatDate(end_date);
  }

  const params = new URLSearchParams();
  Object.keys(data).forEach((key) => {
    params.append(key, data[key]);
  });
  // console.log(params.toString());
  return client.post('/', params).then((response) => response.data);
}

module.exports = {
  getRecords,
};
