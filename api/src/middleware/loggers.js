const morgan = require('morgan');

const apiKeyService = require('../services/api_key');

const auditLogBuffer = [];
const BATCH_SIZE = 20; // Maximum number of logs in a single batch
const FLUSH_INTERVAL = 5000; // Flush logs every 5 seconds
let isFlushing = false;

morgan.token('api_key_id', (req) => req.api_key?.id || '-');
morgan.token('scope', (req) => req.scope || '-');

async function flushAuditLogs() {
  if (isFlushing || auditLogBuffer.length === 0) return;
  const logsToFlush = auditLogBuffer.splice(0, auditLogBuffer.length);
  isFlushing = true;
  try {
    await apiKeyService.createAuditLogs(logsToFlush);
  } catch (error) {
    console.error('Failed to flush audit logs:', error);
  } finally {
    isFlushing = false;
  }
}

/**
 * Middleware to log API requests with an API key
 * Buffer logs and flush them to the database every 5 seconds or when the buffer reaches 20 logs
 * This helps reduce the number of database writes and improve performance
 */
const apiKeyAuditLogger = morgan(
  ':method :url :scope :status :api_key_id :response-time[0]',
  {
    // eslint-disable-next-line no-unused-vars
    skip: (req, res) => !req.api_key, // Only log requests with an API key
    stream: {
      write: async (message) => {
        // Parse log message
        // console.log('message:', message);

        const [method, url, scope, status, api_key_id, response_time] = message.trim().split(' ');

        if (api_key_id && api_key_id !== '-' && !Number.isNaN(parseInt(api_key_id, 10))) {
          try {
            const status_code = parseInt(status, 10);
            const response_time_ms = parseInt(response_time, 10);
            auditLogBuffer.push({
              accessed_at: new Date(),
              api_key_id: parseInt(api_key_id, 10),
              endpoint: url,
              http_method: method,
              status_code: Number.isNaN(status_code) ? null : status_code,
              response_time: Number.isNaN(response_time_ms) ? null : response_time_ms,
              scope: scope === '-' ? null : scope,
            });

            // Flush immediately if batch size is reached
            if (auditLogBuffer.length >= BATCH_SIZE) {
              flushAuditLogs();
            }
          } catch (error) {
            console.error('Failed to log API request:', error);
          }
        }
      },
    },
  },
);

setInterval(flushAuditLogs, FLUSH_INTERVAL);

module.exports = {
  apiKeyAuditLogger,
};
