const Ajv = require('ajv');
const logger = require('../logger');
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

const PHENOTYPE_QUERY = 'phenotype';
const GENOTYPE_QUERY = 'genotype';
const SET_OPERATIONS_QUERY = 'set_operations';
const schema = {
  type: 'object',
  properties: {
    namespace: { type: 'string' },
    name: { type: 'string', enum: [PHENOTYPE_QUERY, GENOTYPE_QUERY, SET_OPERATIONS_QUERY] },
    version: { type: 'string' },
    criteria: {
      anyOf: [
        { $ref: '#/definitions/query' },
        { $ref: '#/definitions/set_operations' },
      ],
    },
  },
  required: ['namespace', 'name', 'criteria', 'version'],
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
            'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
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
    set_operations: {
      type: 'object',
      properties: {
        cohort_ids: {
          type: 'array', items: { type: 'string' }, uniqueItems: true, minItems: 2,
        },
        operators: { type: 'array', items: { enum: ['union', 'intersection', 'difference', 'symmetric_difference'] }, minItems: 1 },
      },
      required: ['cohort_ids', 'operators'],
      additionalProperties: false,
    },
  },
};

const validate = ajv.compile(schema);

function validateCohortQuery(query) {
  const valid = validate(query);
  if (!valid) {
    logger.error(JSON.stringify(validate.errors, null, 2));
    throw new Error('Invalid query');
  }
  return true;
}

function sanitizeQueryTree(queryJson) {
  // for fields that are of type numeric, convert the value to number
  // for fields that are of date type, convert the value to date
  const { operator, children } = queryJson;
  if (children) {
    // non-leaf node
    return {
      operator,
      children: children.map((child) => sanitizeQueryTree(child)),
    };
  }
  // leaf node
  const { field, operator: op, value } = queryJson;
  let new_value = value;
  const [category, fieldName] = field.split('.');

  if (dbSchema[category][fieldName] === 'Int') {
    if (op === 'in' || op === 'not_in') {
      new_value = value.map((v) => parseInt(v, 10));
    } else {
      new_value = parseInt(value, 10);
    }
  }

  if (dbSchema[category][fieldName] === 'Decimal') {
    if (op === 'in' || op === 'not_in') {
      new_value = value.map((v) => parseFloat(v));
    } else {
      new_value = parseFloat(value);
    }
  }

  if (dbSchema[category][fieldName] === 'DateTime') {
    if (op === 'in' || op === 'not_in') {
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

function sanitizeCohortQuery(queryJson) {
  if (queryJson.name === 'phenotype') {
    return {
      ...queryJson,
      criteria: sanitizeQueryTree(queryJson.criteria),
    };
  }
  return queryJson;
}

module.exports = {
  validateCohortQuery,
  sanitizeCohortQuery,
  // validateSetOperations,
  PHENOTYPE_QUERY,
  GENOTYPE_QUERY,
  SET_OPERATIONS_QUERY,
};
