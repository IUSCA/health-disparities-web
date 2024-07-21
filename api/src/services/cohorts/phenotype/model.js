const Ajv = require('ajv');
const _ = require('lodash/fp');
const logger = require('../../logger');

const { dbSchema } = require('./fields');

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

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
    filters: { $ref: '#/definitions/query' },
    snapshot_id: { type: 'number', minimum: 1 },
  },
  required: ['filters', 'snapshot_id'],
  additionalProperties: false,
  definitions: {
    query: {
      type: 'object',
      properties: {
        operator: { enum: ['AND', 'OR', 'NOT_AND', 'NOT_OR'] },
        children: {
          type: 'array',
          items: { anyOf: [{ $ref: '#/definitions/query' }, { $ref: '#/definitions/leafNode' }] },
        },
      },
      required: ['operator', 'children'],
      additionalProperties: false,
    },
    leafNode: {
      type: 'object',
      properties: {
        field: { type: 'string', format: 'customFieldFormat' },
        operator: {
          enum: [
            'in', 'not_in',
            'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'between',
            'contains', 'not_contains', 'starts_with', 'ends_with',
            'is_null', 'is_not_null',
          ],
        },
        value: {
          anyOf: [{
            type: 'array',
            items: {
              anyOf: [{ type: 'string' }, { type: 'number' }],
            },
          }, { type: 'string' }, { type: 'number' }, { type: 'null' }],
        },
      },
      required: ['field', 'operator', 'value'],
      additionalProperties: false,
    },
  },
};
const validateSchema = ajv.compile(schema);

function sanitizeFiltersTree(body) {
  // for fields that are of type numeric, convert the value to number
  // for fields that are of date type, convert the value to date
  const { operator, children } = body;
  if (children) {
    // non-leaf node
    return {
      operator,
      children: children.map((child) => sanitizeFiltersTree(child)),
    };
  }
  // leaf node
  const { field, operator: op, value } = body;
  let new_value = value;
  const [category, fieldName] = field.split('.');

  if (dbSchema[category][fieldName] === 'Int') {
    if (op === 'in' || op === 'not_in' || op === 'between') {
      new_value = value.map((v) => parseInt(v, 10));
    } else {
      new_value = parseInt(value, 10);
    }
  }

  if (dbSchema[category][fieldName] === 'Decimal') {
    if (op === 'in' || op === 'not_in' || op === 'between') {
      new_value = value.map((v) => parseFloat(v));
    } else {
      new_value = parseFloat(value);
    }
  }

  if (dbSchema[category][fieldName] === 'DateTime') {
    if (op === 'in' || op === 'not_in' || op === 'between') {
      new_value = value.map((v) => new Date(v));
    } else {
      new_value = new Date(value);
    }
  }

  return {
    field,
    operator: op,
    value: new_value,
  };
}

function sanitize(body) {
  return {
    ...body,
    filters: sanitizeFiltersTree(body.filters),
  };
}

function validate(query_body) {
  const valid = validateSchema(query_body);
  if (!valid) {
    logger.error(JSON.stringify(validateSchema.errors, null, 2));
    throw new Error('Invalid query', validateSchema.errors);
  }
  return true;
}

module.exports = {
  schema,
  validate,
  sanitize,
  toJSON: _.identity,
};
