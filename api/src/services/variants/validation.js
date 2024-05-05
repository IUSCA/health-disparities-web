const Ajv = require('ajv');

const createError = require('http-errors');
const logger = require('../logger');
const { dbSchema } = require('./fields');

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

// Define custom validation function for the "field" property
function validateField(fieldValue) {
  const parts = fieldValue.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const field = parts[1];
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

ajv.addFormat('nucleotide', isValidNucleotide);

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

/**
 * HOM: Homozygous - 0/0 or 0|0 - 0
 * HET: Heterozygous - 0/1 or 0|1 - 1
 * HETFLP: Heterozygous Flipped - 1|0 - 2
 * HOMALT: Homozygous Alternate - 1/1 or 1|1 - 3
 * MISSING: Missing - . or ./. - -1
 */
const zygositiesSchema = {
  type: 'array',
  items: {
    type: 'string',
    enum: ['MISSING', 'HOM', 'HET', 'HETFLP', 'HOMALT'],
  },
};
const zygMapping = {
  MISSING: -1,
  HOM: 0,
  HET: 1,
  HETFLP: 2,
  HOMALT: 3,
};

function validateZygosities(zygosities) {
  const valid = ajv.validate(zygositiesSchema, zygosities);
  if (!valid) {
    logger.error(JSON.stringify(ajv.errors, null, 2));
    throw createError(400, 'Invalid zygosity');
  }
  return true;
}

function sanitizeZygosities(zygosities) {
  return zygosities.map((zygosity) => zygMapping[zygosity]);
}

const rangesSchema = {
  type: 'array',
  items: {
    anyOf: [{ $ref: '#/definitions/gene' }, { $ref: '#/definitions/region' }, { $ref: '#/definitions/variant' }],
  },
  definitions: {
    gene: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['gene'] },
        value: {
          type: 'object',
          properties: {
            id: { type: 'number', minimum: 1 },
          },
          required: ['id'],
          additionalProperties: false,
        },
      },
      required: ['type', 'value'],
      additionalProperties: false,
    },
    region: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['region'] },
        value: {
          type: 'object',
          properties: {
            chr: { type: 'string' },
            start: { type: 'number', minimum: 1 },
            end: { type: 'number', minimum: 1 },
          },
          required: ['chr', 'start', 'end'],
          additionalProperties: false,
        },
      },
      required: ['type', 'value'],
      additionalProperties: false,
    },
    variant: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['variant'] },
        value: {
          type: 'object',
          properties: {
            chr: { type: 'string' },
            position: { type: 'number', minimum: 1 },
            ref: { type: 'string', format: 'nucleotide' },
            alt: { type: 'string', format: 'nucleotide' },
          },
          required: ['chr', 'position', 'ref', 'alt'],
          additionalProperties: false,
        },
      },
      required: ['type', 'value'],
      additionalProperties: false,
    },
  },
};

function validateRanges(ranges) {
  const valid = ajv.validate(rangesSchema, ranges);
  if (!valid) {
    logger.error(JSON.stringify(ajv.errors, null, 2));
    throw createError(400, 'Invalid ranges');
  }
  return true;
}

function sanitizeRanges(ranges) {
  return ranges.map((range) => {
    if (range.type === 'region') {
      return {
        ...range,
        value: {
          ...range.value,
          chr: encode_chromosome(range.value.chr),
        },
      };
    }
    if (range.type === 'variant') {
      return {
        ...range,
        value: {
          ...range.value,
          chr: encode_chromosome(range.value.chr),
        },
      };
    }
    return range;
  });
}

const schema = {
  type: 'object',
  properties: {
    namespace: { type: 'string' },
    name: { type: 'string', enum: ['genotype'] },
    version: { type: 'string' },
    criteria: {
      anyOf: [
        { $ref: '#/definitions/query' },
      ],
    },
    zygosities: zygositiesSchema,
    ranges: {
      type: 'array',
      items: rangesSchema.items,
    },
    snapshot_id: { type: 'number', minimum: 1 },
    source_id: { type: 'number', minimum: 1 },
  },
  required: ['namespace', 'name', 'criteria', 'version', 'zygosities', 'ranges', 'snapshot_id', 'source_id'],
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
          },
          { type: 'string' },
          { type: 'number' },
          { type: 'null' }],
        },
      },
      required: ['field', 'operator', 'value'],
      additionalProperties: false,
    },
    ...rangesSchema.definitions,
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

function getFieldType(fieldValue) {
  const parts = fieldValue.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const field = parts[1];
  return dbSchema[field];
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

  if (getFieldType(field) === 'Int' || getFieldType(field) === 'BigInt') {
    if (op === 'in' || op === 'not_in') {
      new_value = value.map((v) => parseInt(v, 10));
    } else {
      new_value = parseInt(value, 10);
    }
  }

  if (getFieldType(field) === 'Decimal' || getFieldType(field) === 'Float') {
    if (op === 'in' || op === 'not_in') {
      new_value = value.map((v) => parseFloat(v));
    } else {
      new_value = parseFloat(value);
    }
  }

  if (getFieldType(field) === 'DateTime') {
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
  if (queryJson.name === 'genotype') {
    return {
      ...queryJson,
      criteria: sanitizeQueryTree(queryJson.criteria),
      ranges: sanitizeRanges(queryJson.ranges),
      zygosities: sanitizeZygosities(queryJson.zygosities),
    };
  }
  return queryJson;
}

module.exports = {
  isValidNucleotide,
  encode_chromosome,
  validateQuery,
  sanitizeQuery,
  validateZygosities,
  sanitizeZygosities,
  validateRanges,
  sanitizeRanges,
};
