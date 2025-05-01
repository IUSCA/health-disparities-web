const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('config');

const { deepSortKeys } = require('../../utils');

// Ensure log directory exists
const BASE_DIR = path.resolve(global.__basedir || '.');
const LOG_DIR = path.join(BASE_DIR, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

// Use env/config for log level
const LOG_LEVEL = config.get('redcap.polling.log_level');

const customFormat = winston.format.printf(
  ({ timestamp, level, message }) => JSON.stringify({ timestamp, level, message: deepSortKeys(message) }),
);

const transport = new winston.transports.DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'redcap-poll-errors-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: false,
  maxFiles: '10',
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat,
  ),
});

const logger = winston.createLogger({
  transports: [transport],
});

module.exports = logger;
