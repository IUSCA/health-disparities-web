const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body, query } = require('express-validator');
const createError = require('http-errors');
const _ = require('lodash/fp');

const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');

const accessRequestsService = require('../services/access_requests');
const { fsmConfig } = require('../services/access_requests');
// const userService = require('../services/user');
const redcapPollService = require('../services/redcap_poll');
const redcapService = require('../services/redcap');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
const isPermittedTo = accessControl('cohort_access_requests');
const router = express.Router();

// Get all access requests
router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('cohort_id').optional().isUUID(),
    query('requester_id').optional().isInt().toInt(),
    query('status').optional().isIn(fsmConfig.states),
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
        states: fsmConfig.states,
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
    request.allowed_transitions = accessRequestsService.getFSM(request.status)
      .getAllowedTransitions({ role: req.user.roles[0] });
    res.json(request);
  }),
);

// for self
router.get(
  '/requester/:username/:id',
  isPermittedTo('read', { checkOwnerShip: true }),
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
    res.json(req.permission.filter(request));
  }),
);

// Get all access requests for a requester (self)
router.get(
  '/requester/:username',
  isPermittedTo('read', { checkOwnerShip: true }),
  validate([
    query('cohort_id').optional().isUUID(),
    query('status').optional().isIn(fsmConfig.states),
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
        states: fsmConfig.states,
      },
    });
  }),
);

// Create new access request
router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('cohort_id').isUUID(),
    body('requester_id').isInt().toInt(),
    body('reviewer_id').optional().isInt().toInt(),
    body('status').optional().isIn(fsmConfig.states), // TODO: admins are not allowed to set all statuses
    body('decision_date').optional().isISO8601(),
    body('expires_at').optional().isISO8601(),
    body('notes').isLength({ min: 1, max: 500 }),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']
    const data = _.flow([
      _.pick(['cohort_id', 'requester_id', 'reviewer_id', 'status', 'notes', 'decision_date', 'expires_at']),
      _.omitBy(_.isNil),
    ])(req.body);

    // check if the cohort exists
    // cohort should be published and not temporary
    const cohort = await prisma.cohort.findFirst({
      where: { id: data.cohort_id, is_published: true, is_temp: false },
      select: {
        id: true,
      },
    });
    if (!cohort) {
      return next(createError(404, 'Cohort does not exist or is not published'));
    }

    // check if the requester exists
    const requester = await prisma.user.findUnique({
      where: { id: data.requester_id },
      select: {
        id: true,
      },
    });
    if (!requester) {
      return next(createError(404, 'Requester not found'));
    }

    // check if the reviewer exists
    if (data.reviewer_id) {
      const reviewer = await prisma.user.findUnique({
        where: { id: data.reviewer_id },
        select: {
          id: true,
        },
      });
      if (!reviewer) {
        return next(createError(404, 'Reviewer not found'));
      }
    }

    const request = await accessRequestsService.create(
      data,
      { user: req.user, reason: req.body.reason, source: req.user.role },
    );

    res.status(201).json(request);
  }),
);

// Update access request
router.patch(
  '/:id',
  isPermittedTo('update'),
  validate([
    param('id').isInt().toInt(),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    body('notes').optional().isString(),
    body('reviewer_id').optional({ nullable: true }).isInt().toInt(),
    body('decision_date').optional({ nullable: true }).isISO8601(),
    body('expires_at').optional({ nullable: true }).isISO8601(),
    body('version').isInt({ min: 1 }).toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']

    // if value is undefined, do not set it
    // if value is null, set it to null

    const updateData = _.flow([
      _.pick(['status', 'notes', 'reviewer_id', 'decision_date', 'expires_at']),
      _.omitBy(_.isUndefined),
    ])(req.body);

    // check if the reviewer exists
    if (updateData.reviewer_id) {
      const reviewer = await prisma.user.findUnique({
        where: { id: updateData.reviewer_id },
        select: {
          id: true,
        },
      });
      if (!reviewer) {
        return next(createError(400, 'Reviewer not found'));
      }
    }

    // check if transition is valid
    if (updateData.status) {
      const original = await prisma.cohort_access_request.findFirstOrThrow({
        where: { id: req.params.id },
        select: { id: true, status: true },
      });
      if (original.status !== updateData.status) {
        const fsm = accessRequestsService.getFSM(original.status);
        const canTransition = fsm.canTransition({ role: req.user.role, to: updateData.status });
        if (!canTransition) {
          return next(createError(400, `Invalid transition from ${original.status} to ${updateData.status}`));
        }
        if (!updateData.decision_date) {
          // any status change should set the decision date
          updateData.decision_date = new Date();
        }
      }
    }

    const request = await accessRequestsService.update(
      { id: req.params.id },
      updateData,
      {
        user: req.user, version: req.body.version, reason: req.body.reason, source: req.user.role,
      },
    );

    res.json(request);
  }),
);

// Create access request for self
router.put(
  '/cohort/:cohort_id/requester/:username',
  isPermittedTo('create', { checkOwnerShip: true }),
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
    }, { user: req.user, source: req.user.role });

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
  '/:request_id/survey/complete',
  validate([
    param('request_id').isUUID(),
  ]),
  asyncHandler(async (req, res) => {
  // #swagger.tags = ['Cohort Access Requests']

    const { request_id } = req.params;

    // check if a request with the given request ID exists
    // in the INITIATED state
    const request = await prisma.cohort_access_request.findFirstOrThrow({
      where: {
        request_id,
        status: 'INITIATED',
      },
    });

    try {
      redcapPollService.logger.info(`callback: ${request_id} - survey completed callback received`);
      // fetch records from redcap
      // for the given request ID
      // and created or updated after the request created_at date
      const redcapRecords = await redcapService.getRecords({
        filters: {
          request_id,
        },
        start_date: request.created_at,
      });
      redcapPollService.logger.info(`callback: ${request_id} - Fetched ${redcapRecords.length} records from redcap`);
      const errors = await redcapPollService.processRecords(redcapRecords);
      // eslint-disable-next-line no-restricted-syntax
      for (const error of errors) {
        redcapPollService.logger.info(error); // will stringify and write to the log file
      }
    } catch (error) {
      redcapPollService.logger.error(`callback: ${request_id} - Error handling records: ${error.message}`);
    }

    res.status(204).send();
  }),
);

module.exports = router;
