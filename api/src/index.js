const path = require('path');

// __basedir is the path of root directory
// has same value when used in any js file in this project
global.__basedir = path.join(__dirname, '..');

require('dotenv-safe').config();
require('./db');
const config = require('config');
const app = require('./app');
const logger = require('./services/logger');
const { getCounts } = require('./services/phenotypes');

const port = config.get('express.port');
const host = config.get('express.host');

function on_startup() {
  logger.info('on_startup: trigering initial phenotypes counts to be cached');
  getCounts('lab').then(() => logger.info('lab counts cached'));
  getCounts('dx').then(() => logger.info('dx counts cached'));
  getCounts('medication').then(() => logger.info('medication counts cached'));
  getCounts('hospital').then(() => logger.info('hospital counts cached'));
}

const server = app.listen(port, () => {
  logger.info(`Listening: http://${host}:${port}`);
  on_startup();
});

const shutdown = () => {
  logger.warn('server: closing');
  server.close((err) => {
    if (err) {
      logger.error('server: closed with ERROR', err);
      process.exit(1);
    }
    logger.warn('server: closed');
    process.exit();
  });
};

process.on('SIGINT', () => {
  logger.warn('process received SIGINT');
  shutdown();
});

process.on('SIGTERM', () => {
  logger.warn('process received SIGTERM');
  shutdown();
});
