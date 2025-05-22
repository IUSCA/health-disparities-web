const express = require('express');
const { param, body, query } = require('express-validator');
const createError = require('http-errors');
const _ = require('lodash/fp');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl, getPermission } = require('@/middleware/auth');
const accessRequestsService = require('@/services/access_requests');
// const userService = require('@/services/user');
const redcap = require('@/services/redcap');
const logger = require('@/services/logger');

const isPermittedTo = accessControl('cohort_access_requests');
const router = express.Router();
const { fsm } = accessRequestsService;

function getFSMRole(userRoles) {
  return (userRoles.includes('admin') || userRoles.includes('operator'))
    ? fsm.Roles.ADMIN
    : fsm.Roles.USER;
}

// Get all access requests
router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('cohort_id').optional().isUUID(),
    query('requester_id').optional().isInt().toInt(),
    query('status').optional().isIn(fsm.config.states),
    query('limit').default(50).isInt({ min: 1 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    query('sort_by').default('created_at').isIn(
      ['created_at', 'cohort', 'requester', 'status',
        'decision_date', 'updated_at', 'last_synced_at', 'expires_at'],
    ),
    query('sort_order').default('asc').isIn(['asc', 'desc']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Cohort Access Requests']
    const {
      cohort_id, requester_id, status, search, offset, limit, sort_by, sort_order,
    } = req.query;

    const { requests, total } = await accessRequestsService.findAll({
      cohort_id,
      requester_id,
      status,
      search,
      offset,
      limit,
      sort_by,
      sort_order,
    });

    res.json({
      data: requests,
      metadata: {
        total,
        offset,
        limit,
        states: fsm.config.states,
      },
    });
  }),
);

// Get access request by ID
router.get(
  '/:id',
  isPermittedTo('read'),
  validate([param('id').isInt().toInt()]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Cohort Access Requests']
    const request = await accessRequestsService.findOne({ id: req.params.id }, { audit_logs: true });
    request.allowed_transitions = accessRequestsService.fsm.getFSM(request.status)
      .getAllowedTransitions({ role: getFSMRole(req.user.roles) });
    res.json(request);
  }),
);

// for self
router.get(
  '/requester/:username/:id',
  isPermittedTo('read', { checkOwnership: true }),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']
    const request = await accessRequestsService.findOne({
      id: req.params.id,
    });
    if (request.requester_id !== req.user.id) {
      return next(createError(403, 'You are not allowed to access this request'));
    }

    request.allowed_transitions = fsm
      .getFSM(request.status)
      .getAllowedTransitions({
        role: getFSMRole(req.user.roles),
      });

    res.json(req.permission.filter(request));
  }),
);

// Get all access requests for a requester (self)
router.get(
  '/requester/:username',
  isPermittedTo('read', { checkOwnership: true }),
  validate([
    query('cohort_id').optional().isUUID(),
    query('status').optional().isIn(fsm.config.states),
    query('limit').default(50).isInt({ min: 1 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    query('sort_by').default('created_at').isIn(
      ['created_at', 'cohort', 'requester', 'status',
        'decision_date', 'updated_at', 'last_synced_at', 'expires_at'],
    ),
    query('sort_order').default('asc').isIn(['asc', 'desc']),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['Cohort Access Requests']
    const {
      cohort_id, status, search, offset, limit, sort_by, sort_order,
    } = req.query;

    const { requests, total } = await accessRequestsService.findAll({
      cohort_id,
      requester_username: req.params.username,
      status,
      search,
      offset,
      limit,
      sort_by,
      sort_order,
    });

    res.json({
      data: req.permission.filter(requests),
      metadata: {
        total,
        offset,
        limit,
        states: fsm.config.states,
      },
    });
  }),
);

// Create new access request
// no longer used, may use in the future
// router.post(
//   '/',
//   isPermittedTo('create'),
//   validate([
//     body('cohort_id').isUUID(),
//     body('requester_id').isInt().toInt(),
//     body('status').optional().isIn(fsm.config.states), // TODO: admins are not allowed to set all statuses
//     body('decision_date').optional().isISO8601(),
//     body('expires_at').optional().isISO8601(),
//     body('notes').isLength({ min: 1, max: 500 }),
//   ]),
//   asyncHandler(async (req, res, next) => {
//     // #swagger.tags = ['Cohort Access Requests']
//     const data = _.flow([
//       _.pick(['cohort_id', 'requester_id', 'status', 'notes', 'decision_date', 'expires_at']),
//       _.omitBy(_.isNil),
//     ])(req.body);

//     // check if the cohort exists
//     // cohort should be published and not temporary
//     const cohort = await prisma.cohort.findFirst({
//       where: { id: data.cohort_id, is_published: true, is_temp: false },
//       select: {
//         id: true,
//       },
//     });
//     if (!cohort) {
//       return next(createError(404, 'Cohort does not exist or is not published'));
//     }

//     // check if the requester exists
//     const requester = await prisma.user.findUnique({
//       where: { id: data.requester_id },
//       select: {
//         id: true,
//       },
//     });
//     if (!requester) {
//       return next(createError(404, 'Requester not found'));
//     }

//     const request = await accessRequestsService.create(
//       data,
//       { user: req.user, reason: req.body.reason, source: req.user.roles[0] },
//     );

//     res.status(201).json(request);
//   }),
// );

// Update access request
router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isInt().toInt(),
    body('status').optional().isIn(fsm.config.states),
    body('notes').optional().isString(),
    body('decision_date').optional({ nullable: true }).isISO8601(),
    body('expires_at').optional({ nullable: true }).isISO8601(),
    body('reason').isString().isLength({ min: 1, max: 500 }).optional(),
    body('version').isInt({ min: 1 }).toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']

    // if value is undefined, do not set it
    // if value is null, set it to null

    const updateData = _.flow([
      _.pick(['status', 'notes', 'decision_date', 'expires_at']),
      _.omitBy(_.isUndefined),
    ])(req.body);

    const original = await prisma.cohort_access_request.findFirstOrThrow({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });

    // check if transition is valid
    if (updateData.status) {
      if (original.status !== updateData.status) {
        const canTransition = fsm
          .getFSM(original.status)
          .canTransition({
            role: getFSMRole(req.user.roles),
            to: updateData.status,
          });
        if (!canTransition) {
          return next(createError(400, `Invalid transition from ${original.status} to ${updateData.status}`));
        }
        if (!updateData.decision_date) {
          // any status change should set the decision date
          updateData.decision_date = new Date();
        }
      }
    }

    const request = await accessRequestsService.update({
      identifiers: { id: req.params.id },
      updates: updateData,
      context: {
        user: req.user,
        version: req.body.version,
        reason: req.body.reason,
        source: fsm.Roles.ADMIN,
      },
    });

    res.json(request);
  }),
);

// Create access request for self
router.put(
  '/cohort/:cohort_id/requester/:username',
  isPermittedTo('create', { checkOwnership: true }),
  validate([
    param('cohort_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']
    // #swagger.description = 'Create a new access request for the
    // cohort with the given ID and the requester with the given username if it does not exist'

    // check if the cohort exists
    // cohort should be published and not temporary
    const { cohort_id } = req.params;
    const cohort = await prisma.cohort.findFirst({
      where: { id: cohort_id, is_published: true, is_temp: false },
      select: {
        id: true,
      },
    });
    if (!cohort) {
      return next(createError(404, 'Cohort does not exist or is not published'));
    }

    // check if the requester exists
    const requester = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
      },
    });
    if (!requester) {
      return next(createError(404, 'Requester not found'));
    }

    // will throw unique constraint error if an active request already exists
    // automatically handled by the middleware
    const request = await accessRequestsService.create({
      cohort_id,
      requester_id: requester.id,
    }, { user: req.user, source: fsm.Roles.USER });

    res.status(201).json(request);
  }),
);

// Delete access request
// router.delete(
//   '/:id',
//   isPermittedTo('delete'),
//   validate([
//     param('id').isInt().toInt(),
//   ]),
//   asyncHandler(async (req, res) => {
//     // #swagger.tags = ['Cohort Access Requests']
//     // cascading delete: deletes stages and audit logs
//     await prisma.cohort_access_request.delete({
//       where: { id: req.params.id },
//     });

//     res.status(204).send();
//   }),
// );

router.post(
  '/:request_id/actions/sync',
  validate([
    param('request_id').isUUID(),
  ]),
  asyncHandler(async (req, res, next) => {
  // #swagger.tags = ['Cohort Access Requests']
  // #swagger.description = 'Sync records from redcap for the given request ID - Idempotent'
  /* #swagger.responses[200] = {
      description: 'Sync performed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Request updated',
              },
            },
          },
        },
      }
    }
  */
    // #swagger.responses[400] = { description: 'Invalid request ID' }
    // #swagger.responses[403] = { description: 'Forbidden' }
    // #swagger.responses[404] = { description: 'Request not found or not in a valid state' }
    // #swagger.responses[502] = { description: 'Error fetching records from redcap' }

    const { request_id } = req.params;

    // access control:
    // operators and admins can sync any request
    // users can only sync their own requests
    // we'll use resource: cohort_access_requests and action: create to model this

    const request = await prisma.cohort_access_request.findFirst({
      where: {
        request_id,
      },
    });

    const permission = getPermission({
      resource: 'cohort_access_requests',
      action: 'create',
      requester_roles: req.user.roles,
      checkOwnership: true,
      requester: req.user.id,
      resourceOwner: request.requester_id,
    });

    if (!permission.granted) {
      return next(createError(403));
    }

    // check if a request with the given request ID exists
    // in the INITIATED or PENDING state
    if (!request || !['INITIATED', 'PENDING'].includes(request.status)) {
      return next(createError(404, 'Request not found or not in a valid state'));
    }

    let redcapRecords = [];
    try {
      // fetch records from redcap for the given request ID
      // and created or updated after the request last synced date if present or created_at date
      redcapRecords = await redcap.getRecords({
        filters: {
          request_id,
        },
        start_date: request.last_synced_at || request.created_at,
      });
    } catch (error) {
      logger.error(`sync: ${request_id} - Error fetching records from redcap: ${error.message}`);
      return next(createError.BadGateway('Error fetching records from redcap'));
    }

    // set no cache headers
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (!redcapRecords || redcapRecords.length === 0) {
      logger.info(`sync: ${request_id} - No records found in redcap`);
      return res.json({
        message: 'No changes detected',
      });
    }

    logger.info(`sync: ${request_id} - Fetched ${redcapRecords.length} records from redcap`);
    const [errors, numUpdates] = await redcap.processRecords(redcapRecords, logger);
    // eslint-disable-next-line no-restricted-syntax
    for (const error of errors) {
      logger.error(JSON.stringify(error));
    }

    // errors.length === 0 && numUpdates > 0 : Request updated
    // errors.length > 0 && numUpdates > 0 : Request updated
    // errors.length === 0 && numUpdates === 0 : No changes detected
    // errors.length > 0 && numUpdates === 0 : Request not updated
    // errors.length === redcapRecords.length : something went wrong

    if (numUpdates > 0) {
      res.json({
        message: 'Request updated',
      });
    } else if (errors.length > 0) {
      res.json({
        message: 'Request not updated',
      });
    } else {
      res.json({
        message: 'No changes detected',
      });
    }
  }),
);

module.exports = router;
