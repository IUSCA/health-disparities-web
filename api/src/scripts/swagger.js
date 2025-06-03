require('dotenv-safe').config();
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });
const config = require('config');
const cohortModel = require('../services/cohorts/model');

const doc = {
  info: {
    title: 'Biobank API',
    description: `API documentation for the Biobank project. 
    Click <a href="/api/spec.json">here</a> to download the API specification in JSON format.`,
    version: '1.0.0',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'API Support',
      url: 'https://biobank.sca.iu.edu/about',
      email: config.get('contact.app_admin'),
    },
  },
  servers: [
    {
      url: config.get('api_url'),
    },
  ],
  security: [
    {
      basicAuth: [],
    },
  ],
  tags: [
    {
      name: 'cohorts',
      description: 'Operations related to cohorts',
    },
    {
      name: 'general',
      description: 'General operations',
    },
  ],
  components: {
    securitySchemes: {
      basicAuth: {
        type: 'http',
        scheme: 'basic',
        description: 'HTTP Basic Authentication',
      },
    },
    requestBodies: {
      Cohort: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                query: {
                  $ref: '#/components/schemas/CohortQuery',
                },
                description: { type: 'string' },
                metadata: { type: 'object' },
              },
              required: ['name', 'query'],
            },
            example: {
              name: 'Female 31+',
              description: 'female participants 31 years of age or older',
              query: {
                schema:
                { name: 'phenotype', namespace: 'edu.iu.biobank', version: '1.0.0' },
                body: {
                  filters:
                  {
                    operator: 'AND',
                    children: [
                      { field: 'demographic.gender', operator: 'in', value: ['F'] },
                      { field: 'demographic.age', operator: 'gt', value: '30' },
                    ],
                  },
                  snapshot_id: 1,
                },
              },
            },
          },
        },
      },
    },
    '@schemas': {
      Cohort: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'The cohort ID',
          },
          name: {
            type: 'string',
            description: 'The cohort name',
          },
          query: {
            $ref: '#/components/schemas/CohortQuery',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'The cohort creation date',
          },
          description: {
            type: 'string',
            description: 'The cohort description',
          },
          metadata: {
            type: 'object',
            description: 'The cohort metadata',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'The cohort update date',
          },
          author_username: {
            type: 'string',
            description: 'The cohort author username',
          },
          is_locked: {
            type: 'boolean',
            description: 'Indicates if the cohort is locked',
          },
          is_archived: {
            type: 'boolean',
            description: 'Indicates if the cohort is archived',
          },
          visibility: {
            type: 'string',
            enum: ['PUBLIC', 'PRIVATE', 'UNLISTED'],
            description: 'The cohort visibility status',
          },
          size: {
            type: 'integer',
            description: 'The cohort size',
          },
          author_id: {
            type: 'string',
            format: 'int',
            description: 'The author ID',
          },
          author_name: {
            type: 'string',
            description: 'The author name',
          },
          author_email: {
            type: 'string',
            description: 'The author email',
          },
        },
      },
      CohortQuery: cohortModel.querySchema,
    },
  },
};

const outputFile = '../../swagger_output.json';
const endpointsFiles = ['../routes/index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);
