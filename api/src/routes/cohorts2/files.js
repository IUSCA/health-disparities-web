/* eslint-disable comment-length/limit-single-line-comments */
const assert = require('assert');
const express = require('express');
const { param, query } = require('express-validator');
const createError = require('http-errors');
const config = require('config');
const _ = require('lodash/fp');

const prisma = require('@/db');
const asyncHandler = require('@/middleware/asyncHandler');
const { validate } = require('@/middleware/validators');
const { accessControl, allowOnlyAccessKeys } = require('@/middleware/auth');
const { toTable, toPaginationInfo } = require('@/utils/textTable');
const datasetService = require('@/services/dataset');
const cohortService = require('@/services/cohorts');

const router = express.Router();
const isPermittedTo = accessControl('cohorts');

async function getCohortById(id, username) {
  const sql = cohortService.getCohortByIdQuery(id, username);
  const cohorts = await prisma.$queryRaw(sql);
  return cohorts[0];
}

router.get(
  '/:id/files/summary',
  isPermittedTo('read'),
  validate([
    param('id').isUUID(),
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.operationId = 'getCohortFilesSummary'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Get a summary of files in a cohort'
    // #swagger.description = 'Requires read:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    /* #swagger.responses[200] = {
        description: 'Cohort file summary',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                counts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      file_type: { type: 'string' },
                      file_count: { type: 'integer' },
                      total_size: { type: 'number' },
                    }
                  }
                },
              },
            },
          },
          'text/plain': {
            schema: {
              type: 'string',
              description: 'A text table of the cohort files summary',
            }
          }
        },
      }
    */

    const cohort = await getCohortById(req.params.id, req.user.username);
    if (!cohort) {
      return res.sendStatus(404);
    }

    const sql = cohortService.getCohortFilesSummaryQuery({ id: req.params.id });
    // console.log(sql.sql, sql.values);
    const data = await prisma.$queryRaw(sql);
    res.format({
      json: () => res.json(data),
      text: () => {
        const tableStr = toTable(data);
        return res.send(tableStr);
      },
    });
  }),
);

router.get(
  '/:id/files',
  allowOnlyAccessKeys,
  accessControl('cohort_data')('read'),
  validate([
    param('id').isUUID(),
    query('sort_by').default('id').isIn(['id', 'name', 'size']),
    query('sort_order').default('asc').isIn(['asc', 'desc']),
    query('limit').default(100).isInt({ min: 1, max: 1000 }).toInt(),
    query('offset').default(0).isInt({ min: 0 }).toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'getCohortFiles'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'List data files for a cohort'
    // #swagger.description = 'Requires read:cohorts scope'
    // #swagger.parameters['id'] = { description: 'The cohort id', required: true }
    // #swagger.parameters['sort_by'] = { description: 'Sort by a field', schema: { @enum: ['name', 'size', 'id'], default: 'id' }  }
    // #swagger.parameters['sort_order'] = { description: 'Sort order', schema: { @enum: ['asc', 'desc'], default: 'asc' } }
    // #swagger.parameters['limit'] = { description: 'Limit the number of results', type: 'integer' }
    // #swagger.parameters['offset'] = { description: 'Offset the results', type: 'integer' }
    /* #swagger.responses[200] = {
        description: 'The cohort files',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  md5: { type: 'string' },
                  size: { type: 'number' },
                  participant_id: { type: 'string' },
                },
              },
            },
          },
          'text/plain': {
            schema: {
              type: 'string',
              description: 'A text table of the cohort files',
            }
          }
        },
      },
    */

    // check if user has permission to access the cohort
    const access_request = await prisma.cohort_access_request.findFirst({
      where: {
        requester_id: req.user.id,
        cohort_id: req.params.id,
        status: 'APPROVED',
      },
    });

    if (!access_request) {
      return next(createError(403, "You do not have permission to access this cohort's data.")); // Forbidden
    }

    const sql = cohortService.getCohortFilesQuery({
      id: req.params.id,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const files = await prisma.$queryRaw(sql);
    const total_count = Number(files?.[0]?.total_count || 0);

    const mapper = _.flow([
      _.omit(['total_count']), // remove total_count from each file
      (f) => ({ // add download url
        ...f,
        url: `${config.get('api_url')}/cohorts/files/download/${f.id}`,
      }),
    ]);

    res.format({
      json: () => {
        res.json({
          data: files.map(mapper),
          metadata: {
            total: total_count,
            limit: req.query.limit,
            offset: req.query.offset,
          },
        });
      },
      text: () => {
        const columns = ['id', 'name', 'md5', 'size', 'participant_id'];
        const tableStr = toTable(files.map(mapper), columns);
        const paginationStr = toPaginationInfo({
          total: total_count,
          limit: req.query.limit,
          offset: req.query.offset,
        });
        res.send(`${tableStr}\n${paginationStr}`);
      },
    });
  }),
);

router.get(
  '/files/download/:file_id',
  allowOnlyAccessKeys,
  accessControl('cohort_data')('read'),
  validate([
    param('file_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.operationId = 'downloadCohortFile'
    // #swagger.tags = ['cohorts', 'public']
    // #swagger.summary = 'Download a cohort file'
    /* #swagger.description =
        Requires read:cohorts scope.
        <br/><br/>
        To download the file and save it with the original name, use the following command:
        <pre>curl -J -O -u {key}:{secret} -X GET "{base_url}/cohorts/files/download/{file_id}"</pre>
      */
    // #swagger.parameters['file_id'] = { description: 'The cohort file id', required: true }
    /* #swagger.responses[200] = {
          description: 'Download file',
          content: {
            'application/octet-stream': {
              schema: {
                type: 'string',
                format: 'binary',
              },
            },
          },
          "headers": {
            "Content-Disposition": {
              "schema": {
                "type": "string"
              },
              "description": "Indicates that the response should be treated as a file download"
            }
          }
        },
      */
    /* #swagger.responses[202] = {
      description: 'File is being staged',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    }
  */

    // check if the requester has access to the file
    // file -> dataset -> participant -> zero or more cohorts -> cohort_access_request -> requester
    // if the requester is granted access to any cohort, they can download the file
    // otherwise, return 403

    // To download a file, get its dataset
    // If the dataset is staged, send an internal redirect to the file server with staged path
    // otherwise, try to initiate the staging workflow and return http code 202, with a message to the user to check back later

    const sql = cohortService.getFileInfoQuery({ user_id: req.user.id, file_id: req.params.file_id });
    // console.log(sql.sql, sql.values);
    const files = await prisma.$queryRaw(sql);
    if (!files || files.length === 0) {
      return next(createError(403, 'You do not have permission to access this file.')); // Forbidden
    }

    const file = files[0];
    // console.log(JSON.stringify(file, null, 2));

    const dataset = await datasetService.get_dataset({
      id: file.dataset_id,
      workflows: true,
    });

    if (dataset.is_staged && dataset.metadata.stage_alias) {
      // send an internal redirect to the reverse proxy server with staged path
      const staged_file_path = `${dataset.metadata.stage_alias}/${file.path}`;
      // console.log('staged_file_path:', staged_file_path);
      res.set('X-Accel-Redirect', `/data/${staged_file_path}`);

      // make browser download response instead of attempting to render it
      res.set('Content-Type', 'application/octet-stream');
      // set content-disposition to attachment and set the filename to the original file name
      // use -J -O flags while using curl to download with the correct filename
      res.set('Content-Disposition', `attachment; filename="${file.name}"`);

      // makes nginx not cache the response file
      // otherwise the response cuts off at 1GB as the max buffer size is reached
      // and the file download fails
      // https://stackoverflow.com/a/64282626
      res.set('X-Accel-Buffering', 'no');
      res.send('');
    } else {
      // try to initiate the staging workflow and return http code 202,
      // with a message to the user to check back later
      const wf_name = 'stage';
      try {
        await datasetService.create_workflow(dataset, wf_name, req.user.id);
      } catch (e) {
        // catch assertion error thrown when there is a pending / running workflow
        if (e instanceof assert.AssertionError) {
          // do nothing
        } else {
          // re-throw the error
          console.error(e);
          throw e;
        }
      }

      res.set('Retry-After', 60); // tell the client to retry after 60 seconds
      res.set('Cache-control', 'no-store');
      res.status(202).json({
        message: 'The file is currently being staged. Please check back later.',
      });
    }
  }),
);

module.exports = router;
