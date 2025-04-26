const _ = require('lodash/fp');

function parseDate(dateString) {
  if (!dateString) {
    return;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return;
  }
  return date;
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
