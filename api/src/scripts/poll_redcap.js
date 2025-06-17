/* eslint-disable no-console */
require('module-alias/register');
const path = require('path');

// __basedir is the path of root directory
// has same value when used in any js file in this project
global.__basedir = path.join(__dirname, '..', '..');

require('dotenv-safe').config();

const config = require('config');

const { performSyncWork } = require('../services/redcap');
const fileLogger = require('../services/redcap/logger');

const INTERVAL_MS = config.get('redcap.polling.interval_seconds') * 1000;
let interval = INTERVAL_MS;
const MAX_BACKOFF_MS = config.get('redcap.polling.max_backoff_seconds') * 1000;

// normal interval - 300
// delay to 1st retry - 600
// delay to 2nd retry - 1200
// delay to 3rd retry - 1800

const poll = async () => {
  try {
    await performSyncWork(fileLogger);
    interval = INTERVAL_MS; // Reset interval on success
  } catch (error) {
    console.error(`Error polling: ${error.message}`);
    interval = Math.min(interval * 2, MAX_BACKOFF_MS); // Increase interval with backoff up to a max
  } finally {
    setTimeout(poll, interval);
  }
};

poll();
// performSyncWork().then(() => {
//   console.log('Polling completed successfully');
// }).catch((error) => {
//   console.error(`Polling failed: ${error.message}`);
// });
