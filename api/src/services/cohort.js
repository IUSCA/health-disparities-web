const Ajv = require('ajv');
const { Prisma } = require('@prisma/client');
const logger = require('./logger');

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

const getFieldsWithType = (model_name) => {
  // types
  const allowedTypes = ['Int', 'String', 'DateTime', 'Decimal', 'Boolean'];

  // Get the metadata for all models
  const { models } = Prisma.dmmf.datamodel;

  // Find the specific model
  const model = models.find((m) => m.name === model_name);

  // If it's not empty return the fields as an object
  if (model) {
    const fields = model.fields
      .filter((field) => allowedTypes.includes(field.type))
      .reduce((acc, field) => {
        acc[field.name] = field.type;
        return acc;
      }, {});
    // console.log(`fields = ${JSON.stringify(fields)}`)
    return fields;
  }
  return null;
};

const tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];
const dbSchema = tables.reduce(
  (acc, table) => {
    acc[table] = getFieldsWithType(table);
    return acc;
  },
  {},
);

// Add custom fields that are not in the database schema but are used in the query
dbSchema.demographic.age = 'Int';

// Define custom validation function for the "field" property
function validateField(fieldValue) {
  // console.log('fieldValue', fieldValue);
  const parts = fieldValue.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [category, field] = parts;
  return dbSchema[category] && dbSchema[category][field];
}

// Add custom format to validate the "field" property
ajv.addFormat('customFieldFormat', validateField);

const schema = {
  type: 'object',
  properties: {
    operator: { enum: ['AND', 'OR', 'AND_NOT'] },
    children: {
      type: 'array',
      items: { anyOf: [{ $ref: '#' }, { $ref: '#/definitions/leafNode' }] },
    },
  },
  required: ['operator', 'children'],
  definitions: {
    leafNode: {
      type: 'object',
      properties: {
        field: { type: 'string', format: 'customFieldFormat' },
        operator: { enum: ['in', 'not_in', 'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'not_contains', 'starts_with', 'ends_with'] },
        value: {
          anyOf: [{
            type: 'array',
            items: {
              anyOf: [{ type: 'string' }, { type: 'number' }],
            },
          }, { type: 'string' }, { type: 'number' }],
        },
      },
      required: ['field', 'operator', 'value'],
    },
  },
};

const validate = ajv.compile(schema);

function validateCohortQuery(query) {
  const valid = validate(query);
  if (!valid) {
    logger.error(validate.errors);
    throw new Error('Invalid query');
  }
  return true;
}

module.exports = {
  validateCohortQuery,
};
