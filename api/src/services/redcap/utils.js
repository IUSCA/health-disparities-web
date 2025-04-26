const _ = require('lodash/fp');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('config');

const REDCAP_TIMEZONE = config.get('redcap.timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Parses a date string and converts it from server's timezone to a UTC JavaScript Date object.
 *
 * @param {string} dateString - The date string to parse.
 * @param {boolean} [ignore_errors=false] - Whether to suppress errors and return undefined if parsing fails.
 * @returns {Date|undefined} The parsed Date object in UTC, or undefined if the input is invalid or errors are ignored.
 * @throws {Error} Throws an error if parsing fails and `ignore_errors` is false.
 */
function parseDate(dateString, ignore_errors = false) {
  if (!dateString) {
    return undefined;
  }

  try {
    const d = dayjs.tz(dateString, REDCAP_TIMEZONE);
    if (d.isValid()) {
      return d.utc().toDate();
    }
  } catch (error) {
    if (!ignore_errors) {
      throw error;
    }
    return undefined;
  }
}

function parseStatus(status) {
  if (status === '1') {
    return 'APPROVED';
  } if (status === '0') {
    return 'REJECTED';
  }
  return 'PENDING';
}

function parseSTEStatus(status) {
  if (status === '1') {
    return 'APPROVED';
  } if (status === '0') {
    return 'REJECTED';
  } if (status === '2') {
    return 'APPROVED_WITH_REVISIONS';
  }
  return 'PENDING';
}

const getLastModifiedDate = _.flow([
  _.pickBy((value, key) => key.endsWith('_timestamp')),
  _.values,
  _.map((value) => new Date(value)),
  _.filter((date) => !Number.isNaN(date.getTime())),
  _.max,
]);

module.exports = {
  parseDate,
  parseStatus,
  parseSTEStatus,
  getLastModifiedDate,
};
