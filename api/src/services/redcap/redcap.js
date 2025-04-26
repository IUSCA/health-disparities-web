const axios = require('axios');
const config = require('config');
const _ = require('lodash/fp');

const client = axios.create({
  baseURL: config.get('redcap.base_url'),
});
const API_TOKEN = config.get('redcap.api_token');

function buildRedcapFilterLogic(filters) {
  const _filters = _.omitBy(_.isUndefined, filters);
  if (_.isEmpty(_filters)) {
    return '';
  }
  const conditions = Object.entries(_filters).map(([key, value]) => `[${key}]="${value}"`);
  return conditions.join(' && ');
}

/**
 * Get records from REDCap
 * @param {Object} options
 * @param {Array} options.select - Fields to select
 * @param {Date} options.start_date - Return only records that have been created or modified *after* a given date/time in Redcap server timezone
 * @param {Date} options.end_date - Return only records that have been created or modified *before* a given date/time in Redcap server timezone
 * @returns {Promise} - A promise that resolves with the records
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
    // convert to YYYY-MM-DD HH:MM:SS
    // eslint-disable-next-line prefer-destructuring
    data.dateRangeBegin = start_date.toISOString().split('T')[0];
  }

  if (end_date) {
    // convert to YYYY-MM-DD HH:MM:SS
    // eslint-disable-next-line prefer-destructuring
    data.dateRangeEnd = end_date.toISOString().split('T')[0];
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
