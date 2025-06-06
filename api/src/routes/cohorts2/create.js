/* eslint-disable comment-length/limit-single-line-comments */
const express = require('express');
const { body } = require('express-validator');
const _ = require('lodash/fp');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl } = require('@/middleware/auth');

const cohortModel = require('@/services/cohorts/model');
const cohortService = require('@/services/cohorts');
const { cohortToJSON } = require('@/services/cohorts/utils');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

router.post(
  '/',
  isPermittedTo('create'),
  validate([
    body('name').isString().notEmpty(),
    body('description').isString().isLength({ min: 10 }),
    body('query').custom(cohortModel.validate).bail().customSanitizer(cohortModel.sanitize),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'createCohort'
    // #swagger.tags = ['cohorts']
    // #swagger.summary = 'Create a cohort'
    // #swagger.description = 'Requires create:cohorts scope'
    // #swagger.requestBody = { $ref: '#/components/requestBodies/Cohort' }
    /* #swagger.responses[200] = {
        description: 'Cohort',
        content: {
          'application/json': {
            schema: {
              "$ref": "#/components/schemas/Cohort"
            }
          }
        }
      }
    */

    const cohort_data = _.flow([
      _.pick(['name', 'query', 'description', 'metadata']),
      _.omitBy(_.isNil),
    ])(req.body);

    const sqlQuery = await cohortService.searchParticipantsQueryAsync({
      schema: cohort_data.query.schema,
      body: {
        ...cohort_data.query.body,
        protocol_id: 1, // todo
        username: req.user.username,
      },
    });
    // eslint-disable-next-line no-console
    console.log(sqlQuery.sql, sqlQuery.values);
    const rows = await prisma.$queryRaw(sqlQuery);

    // rows is like [{participant_id: 1}, {participant_id: 2}, ...]
    const participants_ids = rows.map((row) => row.participant_id);

    const createdCohort = await prisma.cohort.create({
      data: {
        ...cohort_data,
        author_username: req.user.username,
        participants: participants_ids,
      },
      select: {
        id: true,
      },
    });

    const cohort = await prisma.cohort_view.findUniqueOrThrow({
      where: {
        id: createdCohort.id,
      },
      include: {
        author: true,
      },
    });

    return res.json(cohortToJSON(cohort));
  }),
);

module.exports = router;
