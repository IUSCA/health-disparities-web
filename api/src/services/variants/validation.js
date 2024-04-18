const Ajv = require('ajv');

const createError = require('http-errors');
const logger = require('../logger');
const { dbSchema } = require('./fields');

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

// Define custom validation function for the "field" property
function validateField(field) {
  // console.log('fieldValue', fieldValue);
  return !!dbSchema[field];
}

// Add custom format to validate the "field" property
ajv.addFormat('customFieldFormat', validateField);

function isValidNucleotide(nucleotide) {
  if (!/^[ATCG]+$/i.test(nucleotide)) {
    throw new Error('Invalid nucleotide');
  }
  return true;
}

function encode_chromosome(decoded) {
  // 1-22 should be converted to int
  // X or XX should be converted to 23
  // Y or XY should be converted to 24
  if (!decoded) {
    return null;
  }
  const mapping = {
    X: 23,
    Y: 24,
    XX: 23,
    XY: 24,
  };
  const chr_int = mapping[decoded.toUpperCase()] || parseInt(decoded, 10);
  if (Number.isNaN(chr_int) || chr_int < 1 || chr_int > 24) {
    throw createError(400, 'Invalid input: chromosome is not valid');
  }
  return chr_int;
}

const VARIANT_SEARCH = 'VARIANT_SEARCH';
const schema = {
  type: 'object',
  properties: {
    namespace: { type: 'string' },
    name: { type: 'string', enum: [VARIANT_SEARCH] },
    version: { type: 'string' },
    criteria: {
      anyOf: [
        { $ref: '#/definitions/query' },
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
        function: { enum: ['count', 'min', 'max', 'avg', 'sum'] },
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
          },
          { type: 'string' },
          { type: 'number' },
          { type: 'null' },
          { type: 'string', format: 'customFieldFormat' }],
        },
      },
      required: ['field', 'operator', 'value'],
      additionalProperties: false,
    },
  },
};

const validate = ajv.compile(schema);

function validateQuery(query) {
  const valid = validate(query);
  if (!valid) {
    logger.error(JSON.stringify(validate.errors, null, 2));
    throw createError(400, 'Invalid query');
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

  if (dbSchema[field] === 'Int') {
    if (op === 'in' || op === 'not_in') {
      new_value = value.map((v) => parseInt(v, 10));
    } else {
      new_value = parseInt(value, 10);
    }
  }

  if (dbSchema[field] === 'Decimal') {
    if (op === 'in' || op === 'not_in') {
      new_value = value.map((v) => parseFloat(v));
    } else {
      new_value = parseFloat(value);
    }
  }

  if (dbSchema[field] === 'DateTime') {
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

function sanitizeQuery(queryJson) {
  if (queryJson.name === VARIANT_SEARCH) {
    return {
      ...queryJson,
      criteria: sanitizeQueryTree(queryJson.criteria),
    };
  }
  return queryJson;
}

module.exports = {
  isValidNucleotide,
  encode_chromosome,
  validateQuery,
  sanitizeQuery,
};
