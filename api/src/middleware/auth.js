const createError = require('http-errors');
const _ = require('lodash/fp');
const config = require('config');

const authService = require('../services/auth');
const userService = require('../services/user');
const apiKeyService = require('../services/api_key');
const { setIntersection } = require('../utils');
const ac = require('../services/accesscontrols');
const asyncHandler = require('./asyncHandler');

const UPSTREAM_SERVER_HEADER = config.get('api_keys.upstream_server_protection.header_name');
const UPSTREAM_SERVER_VALUES = config
  .get('api_keys.upstream_server_protection.allowed_values')
  .map((s) => s.toLowerCase());

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader) return next(createError.Unauthorized('Authentication failed. Authorization header not found.'));

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const auth = authService.checkJWT(token);
    if (!auth) return next(createError.Unauthorized('Authentication failed. Token is not valid.'));

    req.user = auth.profile;
    return next();
  }
  if (config.get('api_keys.enabled') && authHeader.startsWith('Basic ')) {
    // console.log(JSON.stringify(req.headers, null, 2));
    // api key authentication
    if (config.get('api_keys.upstream_server_protection.enabled')) {
      // the incoming request must come from the designated upstream server (reverse proxy)
      const serverName = req.get(UPSTREAM_SERVER_HEADER);
      if (!serverName) {
        console.warn(
          `Missing header ${UPSTREAM_SERVER_HEADER} in request. This is required for API key authentication.`,
        );
        return next(createError.Unauthorized());
      }

      if (!UPSTREAM_SERVER_VALUES.includes(serverName.toLowerCase())) {
        console.warn(
          `Invalid value for header ${UPSTREAM_SERVER_HEADER} in request. This is required for API key authentication.`,
        );
        return next(createError.Unauthorized());
      }
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials || '', 'base64').toString('ascii');
    const [key, secret] = credentials.split(':');
    if (!key || !secret) return next(createError.Unauthorized('Authentication failed. Invalid credentials format.'));

    try {
      const ip_address = req.get('X-Real-IP') || ''; // see nginx config
      // console.log(JSON.stringify({ key, secret, ip_address }, null, 2));
      const apiKey = await apiKeyService.checkApiKey({ key, secret, ip_address });
      if (apiKey) {
        const { user, ...restOfApiKey } = apiKey;
        const user_profile = authService.get_user_profile(userService.transformUser(user));
        req.user = user_profile;
        req.api_key = restOfApiKey;
        // console.log(JSON.stringify(req.user));
        return next();
      }
      return next(createError.Unauthorized('Authentication failed. Api Key is not valid.'));
    } catch (error) {
      console.error('Error checking API key:', error);
      return next(createError.InternalServerError(
        'Authentication failed. An error occurred while checking the API key.',
      ));
    }
  }
  return next(createError.Unauthorized('Authentication failed. Auth method not supported.'));
});

// function checkRole(role) {
//   // role can be a string indicating single role or an array of strings
//   // to check for multiple roles
//   // in case of multiple roles, user is allowed if they have at least one of the provided roles
//   return (req, res, next) => {
//     const userRoles = req?.user?.roles || [];
//     const allowedRoles = Array(role).flat().concat('superuser');
//     const authorized = allowedRoles.some((r) => userRoles.includes(r));
//     if (!authorized) {
//       return next(createError.Forbidden('Not permitted'));
//     }
//     next();
//   };
// }

function buildActions(action) {
  const actions = {};

  switch (action) {
    case 'create':
      actions.any = 'createAny';
      actions.own = 'createOwn';
      break;

    case 'update':
      actions.any = 'updateAny';
      actions.own = 'updateOwn';
      break;

    case 'read':
      actions.any = 'readAny';
      actions.own = 'readOwn';
      break;

    case 'delete':
      actions.any = 'deleteAny';
      actions.own = 'deleteOwn';
      break;

    default:
      throw new Error('invalid action');
  }
  return actions;
}

const accessControl = _.curry((
  resource,
  action,
  { checkOwnerShip = false } = {},
  // resourceOwnerFn = null,
  // requesterFn = null,
) => {
  // default checkOwnerShip is false, meaning '{action}:any' is checked
  // if checkOwnerShip is true, '{action}:own' is checked instead of '{action}:any'

  // https://github.com/pawangspandey/accesscontrol-middleware/blob/master/index.js
  const actions = buildActions(action);
  // const _resourceOwnerFn = resourceOwnerFn || ((req) => req.params.username);
  // const _requesterFn = requesterFn || ((req) => req.user.username);
  return (req, res, next) => {
    // filter user roles that match defined roles
    const roles = [...setIntersection(ac.getRoles(), req?.user?.roles || [])];
    const resourceOwner = req.params.username; // _resourceOwnerFn(req);
    const requester = req.user?.username; // _requesterFn(req);

    // console.log('access-controls', {
    //   resource, action, checkOwnerShip, resourceOwner, requester, roles,
    // });

    if (roles && roles.length > 0) {
      const acQuery = ac.can(roles);
      const permission = (checkOwnerShip && requester === resourceOwner)
        ? acQuery[actions.own](resource)
        : acQuery[actions.any](resource);
      if (permission.granted) {
        // check if the request is made by an API key
        // if so, check if the required scope is one of the scopes of the API key
        if (req.api_key) {
          const requiredScope = `${action}:${resource}`;
          if (!req.api_key.scopes?.includes(requiredScope)) {
            return next(createError(403, 'Insufficient scope'));
          }
          req.scope = requiredScope;
        }
        req.permission = permission;
        return next();
      }
      return next(createError(403, 'Insufficient permissions'));
    }
    return next(createError(403, 'No roles found'));
  };
});

function getPermission({
  resource,
  action,
  requester_roles,
  checkOwnerShip = false,
  requester,
  resourceOwner,
}) {
  const actions = buildActions(action);
  // filter user roles that match defined roles
  const roles = [...setIntersection(ac.getRoles(), requester_roles || [])];
  if (roles && roles.length > 0) {
    const acQuery = ac.can(roles);
    return (checkOwnerShip && requester === resourceOwner)
      ? acQuery[actions.own](resource)
      : acQuery[actions.any](resource);
  }
}

const loginHandler = asyncHandler(async (req, res, next) => {
  const user = req.auth_user;
  if (user) {
    const resObj = await authService.onLogin({ user, method: req.auth_method });

    if (user.roles.includes('admin')) {
      // set cookie
      res.cookie('grafana_token', authService.issueGrafanaToken(user), {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      });
    } else {
      // if user is not an admin, clear the cookie
      res.clearCookie('grafana_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      });
    }

    return res.json(resObj);
  }
  // User was authenticated but they are not a portal user
  // Send an empty success message
  return res.status(204).send();
});

module.exports = {
  authenticate,
  accessControl,
  getPermission,
  loginHandler,
};
