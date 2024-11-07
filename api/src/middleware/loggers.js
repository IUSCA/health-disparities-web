const morgan = require('morgan');

const apiKeyService = require('../services/api_key');

morgan.token('api_key', (req) => req.api_key?.key || '-');
morgan.token('scope', (req) => req.scope || '-');

const apiKeyAuditLogger = morgan(
  ':method :url :scope :status :api_key :response-time[0]',
  {
    // eslint-disable-next-line no-unused-vars
    skip: (req, res) => !req.api_key, // Only log requests with an API key
    stream: {
      write: async (message) => {
        // Parse log message
        // console.log('message:', message);

        const [method, url, scope, status, api_key, response_time] = message.trim().split(' ');

        if (api_key && api_key !== '-') {
          try {
            const status_code = parseInt(status, 10);
            const response_time_ms = parseInt(response_time, 10);
            await apiKeyService.createAuditLog({
              accessed_at: new Date(),
              key: api_key,
              endpoint: url,
              http_method: method,
              status_code: Number.isNaN(status_code) ? null : status_code,
              response_time: Number.isNaN(response_time_ms) ? null : response_time_ms,
              scope: scope === '-' ? null : scope,
            });
          } catch (error) {
            console.error('Failed to log API request:', error);
          }
        }
      },
    },
  },
);

module.exports = {
  apiKeyAuditLogger,
};
