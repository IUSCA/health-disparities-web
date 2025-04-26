const { performSyncWork, processRecords } = require('./sync');
const { getRecords } = require('./redcap');

module.exports = {
  getRecords,
  performSyncWork,
  processRecords,
};
