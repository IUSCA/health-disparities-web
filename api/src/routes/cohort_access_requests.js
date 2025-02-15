const assert = require('assert');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, body, query } = require('express-validator');
const createError = require('http-errors');
const _ = require('lodash/fp');

const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');

const prisma = new PrismaClient();
const isPermittedTo = accessControl('cohort_access_requests');
const router = express.Router();

const cohort_columns = {
  id: true,
  name: true,
  // description: true,
  // created_at: true,
  // updated_at: true,
  // query: true,
  // metadata: true,
  // is_published: true,
  // is_locked: true,
  // is_protected: true,
  // author_username: true,
};

// Get all access requests
router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('cohort_id').optional().isUUID(),
    query('requester_id').optional().isInt().toInt(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    query('limit').default(50).isInt({ min: 1 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
    query('sortBy').default('created_at').isIn(['created_at', 'status', 'decision_date']),
    query('sortOrder').default('asc').isIn(['asc', 'desc']),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Cohort Access Requests']
    const {
      cohort_id, requester_id, status, offset, limit,
    } = req.query;

    const where = {};
    if (cohort_id) where.cohort_id = cohort_id;
    if (requester_id) where.requester_id = requester_id;
    if (status) where.status = status;

    if (req.query.search) {
      where.OR = [
        { requester: { username: { contains: req.query.search, mode: 'insensitive' } } },
        { cohort: { name: { contains: req.query.search, mode: 'insensitive' } } },
      ];
    }

    let sortBy = {
      [req.query.sortBy]: req.query.sortOrder,
    };
    const nullable_order_by_fields = ['decision_date'];
    if (nullable_order_by_fields.includes(req.query.sortBy)) {
      sortBy = {
        [req.query.sortBy]: {
          sort: req.query.sortOrder,
          nulls: 'last',
        },
      };
    }

    const [requests, total] = await prisma.$transaction([
      prisma.cohort_access_request.findMany({
        where,
        include: {
          requester: true,
          cohort: {
            select: cohort_columns,
          },
          reviewer: true,
        },
        skip: offset,
        take: limit,
        orderBy: sortBy,
      }),
      prisma.cohort_access_request.count({ where }),
    ]);

    res.json({
      data: requests,
      metadata: {
        total,
        offset,
        limit,
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
    const request = await prisma.cohort_access_request.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        requester: true,
        cohort: {
          select: cohort_columns,
        },
        reviewer: true,
      },
    });

    res.json(request);
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
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    body('decision_date').optional().isISO8601(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']
    const data = _.flow([
      _.pick(['cohort_id', 'requester_id', 'reviewer_id', 'status', 'notes', 'decision_date']),
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

    const request = await prisma.cohort_access_request.create({
      data,
      include: {
        requester: true,
        cohort: {
          select: cohort_columns,
        },
        reviewer: true,
      },
    });

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
    body('reviewer_id').optional().isInt().toInt(),
    body('decision_date').optional().isISO8601(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Cohort Access Requests']
    const {
      status, notes, reviewer_id, decision_date,
    } = req.body;

    assert(status, 'Status cannot be null');

    // check if the reviewer exists
    if (reviewer_id) {
      const reviewer = await prisma.user.findUnique({
        where: { id: reviewer_id },
        include: {
          id: true,
        },
      });
      if (!reviewer) {
        return next(createError(404, 'Reviewer not found'));
      }
    }

    const updateData = {
      status,
      reviewer_id,
      decision_date,
    };
    // if notes is a string, set it
    // if notes is null, set it to null
    // if notes is undefined, do not set it
    if (notes !== undefined) updateData.notes = notes;

    const request = await prisma.cohort_access_request.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        requester: true,
        cohort: {
          select: cohort_columns,
        },
        reviewer: true,
      },
    });

    res.json(request);
  }),
);

// Delete access request
router.delete(
  '/:id',
  isPermittedTo('delete'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Cohort Access Requests']
    await prisma.cohort_access_request.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  }),
);

module.exports = router;
