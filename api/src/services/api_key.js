const crypto = require('crypto');
const config = require('config');

// const logger = require('./logger');
const prisma = require('@/db');
const { INCLUDE_ROLES_LOGIN } = require('./user');

const API_KEY_INCLUDES = {
  user: {
    include: INCLUDE_ROLES_LOGIN,
  },
  scopes: {
    include: {
      scope: true,
    },
  },
};

function sanitizeApiKey(apiKey) {
  // delete the secret from the response
  // transform scopes, whitelisted_subnets to arrays of strings
  // eslint-disable-next-line no-unused-vars
  const { secret, ...rest } = apiKey;
  return {
    ...rest,
    ...(apiKey.scopes ? { scopes: apiKey.scopes.map((obj) => obj?.scope?.name) } : {}),
    ...(apiKey.whitelisted_subnets ? { whitelisted_subnets: apiKey.whitelisted_subnets.map((obj) => obj.subnet) } : {}),
  };
}

/**
 * Checks the validity of an API key and its associated secret.
 *
 * API Key Validity:
 *    Ensures the key matches.
 *    Checks if the key is not expired.
 *    Ensures the key is not revoked.
 *    Encrypts and compares the secret.
 *    Ensures the associated user record exists.
 *    Ensures the associated user is active (is_deleted = false).
 *    Ensures the IP address is in a whitelisted subnet if any exist.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.key - The API key to be checked.
 * @param {string} params.secret - The secret associated with the API key.
 * @param {string} params.ip_address - The IP address of the request.
 * @returns {Promise<Object|null>} - Returns the API key object with associated user and scopes if valid, otherwise null.
 */
async function checkApiKey({ key, secret, ip_address }) {
  const encryptionKey = config.get('api_keys.encryption_key');
  return prisma.$transaction(async (_prisma) => {
    const result = await _prisma.$queryRaw`
      SELECT ak.id
      FROM api_key ak
      JOIN "user" u ON ak.user_id = u.id
      LEFT JOIN subnet s ON s.api_key_id = ak.id
      WHERE 
        ak.key = ${key} AND
        ak.expires_at > NOW() AND
        ak.revoked = false AND
        pgp_sym_decrypt(ak.secret, ${encryptionKey}) = ${secret} AND
        u.is_deleted = false AND
        (
          -- Allow if no whitelisted subnets exist or
          -- comment out the following line to invalidate the API key if no whitelisted subnets exist
          NOT EXISTS (SELECT 1 FROM subnet WHERE api_key_id = ak.id) OR
          -- if the IP address is in a whitelisted subnet
          (${ip_address} IS NULL OR ${ip_address} = '' OR ${ip_address}::INET <<= s.subnet)
        )
    `;
    if (result.length === 0) {
      return null;
    }

    const apiKey = await prisma.api_key.findUnique({
      where: {
        key,
      },
      include: API_KEY_INCLUDES,
    });
    return sanitizeApiKey(apiKey);
  });
}

/**
 * Creates a new API key for a user with the specified details.
 *
 * @param {Object} params - The parameters for creating the API key.
 * @param {string} params.username - The username of the user for whom the API key is being created.
 * @param {string} params.name - The name of the API key.
 * @param {string[]} params.scopes - The scopes associated with the API key.
 * @param {Date} params.expires_at - The expiration date of the API key.
 * @param {string} params.description - A description of the API key.
 * @returns {Promise<Object>} The created API key object with the decrypted secret.
 */
async function createApiKey({
  username, name, scopes, expires_at, description, whitelisted_subnets = [],
}) {
  // console.log('Creating API key for user:', JSON.stringify({
  //   username, name, scopes, expires_at, description, whitelisted_subnets,
  // }, null, 2));
  // create a random key
  const _key = crypto.randomBytes(16).toString('hex'); // Generates a 32-character string

  // create a random secret
  const decrypted_secret = crypto.randomBytes(32).toString('hex'); // Generates a 64-character string

  const encryptionKey = config.get('api_keys.encryption_key');

  return prisma.$transaction(async (_prisma) => {
    // create the API key
    const result = await _prisma.$queryRaw`
      INSERT INTO api_key (user_id, key, secret, expires_at, name, description)
      VALUES (
        (SELECT u.id FROM "user" u WHERE u.username = ${username}),
        ${_key}, 
        pgp_sym_encrypt(${decrypted_secret}, ${encryptionKey})::BYTEA, 
        ${expires_at}, 
        ${name},
        ${description}
      )
      RETURNING id 
    `;
    const key_id = result[0].id;

    // connect the scopes
    await _prisma.$executeRaw`
      INSERT INTO api_key_scope (api_key_id, scope_id)
      SELECT ${key_id}, id 
      FROM scope 
      WHERE name = ANY(${scopes})
    `;

    // create the subnets
    if (whitelisted_subnets.length > 0) {
      await _prisma.$executeRaw`
        INSERT INTO SUBNET (api_key_id, subnet)
        SELECT ${key_id}, sn::inet
        FROM UNNEST(${whitelisted_subnets}) sn
      `;
    }

    let apiKey = await _prisma.api_key.findUnique({
      where: {
        id: key_id,
      },
      include: {
        user: true,
        scopes: {
          include: {
            scope: true,
          },
        },
      },
    });
    apiKey = sanitizeApiKey(apiKey);
    apiKey.secret = decrypted_secret;
    return apiKey;
  });
}

/**
 * Fetches an API key along with its decrypted secret using either the provided id or key.
 *
 * @param {Object} params - The parameters for fetching the API key.
 * @param {string} [params.id] - The ID of the API key to fetch.
 * @param {string} [params.key] - The key of the API key to fetch.
 * @returns {Promise<Object>} The API key object with the decrypted secret.
 */
// async function fetchApiKeyWithSecret({ id, key }) {
//   // use the id if provided, otherwise use the key
//   const where = id ? { id } : { key };
//   const encryptionKey = config.get('api_keys.encryption_key');
//   return prisma.$transaction(async (_prisma) => {
//     const apiKey = await _prisma.api_key.findUnique({
//       where,
//       include: API_KEY_INCLUDES,
//     });
//     const result = await _prisma.$queryRaw`
//       SELECT pgp_sym_decrypt(secret, ${encryptionKey})::TEXT AS secret
//       FROM api_key
//       WHERE id = ${apiKey.id}
//     `;
//     return { ...apiKey, secret: result[0].secret };
//   });
// }

async function createAuditLog({
  key, endpoint, http_method, status_code, response_time, scope, accessed_at,
}) {
  const data = {
    endpoint,
    http_method,
    status_code,
    response_time,
    accessed_at,
    api_key: {
      connect: {
        key,
      },
    },
  };
  if (scope) {
    data.scope = {
      connect: {
        name: scope,
      },
    };
  }
  return prisma.api_audit_log.create({
    data,
  });
}

const scopeCache = new Map();
/**
 * Resolves the scopes based on the provided names.
 * Checks a local cache first, and only queries the database for missing scopes.
 *
 * @param {Set<string>} names - A set of scope names to resolve.
 * @returns {Promise<Object>} A promise that resolves to an object where the keys are scope names and the values are scope IDs.
 */
async function resolveScopes(names) {
  // Separate names into cached and missing (not in cache)
  const cachedScopes = {};
  const missingNames = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const name of names) {
    if (scopeCache.has(name)) {
      cachedScopes[name] = scopeCache.get(name);
    } else {
      missingNames.push(name);
    }
  }

  // If all scopes are found in cache, return them
  if (missingNames.length === 0) {
    return cachedScopes;
  }

  // Fetch only missing scopes from the database
  // console.log('Fetching missing scopes:', missingNames);
  const fetchedScopes = await prisma.scope.findMany({
    where: {
      name: {
        in: missingNames,
      },
    },
  });

  // Update the cache and prepare results for missing scopes
  // eslint-disable-next-line no-restricted-syntax
  for (const scope of fetchedScopes) {
    scopeCache.set(scope.name, scope.id); // Update cache
    cachedScopes[scope.name] = scope.id; // Add to result
  }

  return cachedScopes;
}

async function createAuditLogs(logs) {
  // resolve scope to an id in each log
  const unique_scopes = new Set(logs.map((log) => log.scope).filter((scope) => scope !== null));
  const scope_map = await resolveScopes(unique_scopes);
  const data = logs.map((log) => {
    const { scope, ...rest } = log;
    return {
      ...rest,
      scope_id: scope_map[scope] || null,
    };
  });

  return prisma.api_audit_log.createMany({
    data,
  });
}

module.exports = {
  checkApiKey,
  createApiKey,
  createAuditLog,
  sanitizeApiKey,
  createAuditLogs,
};
