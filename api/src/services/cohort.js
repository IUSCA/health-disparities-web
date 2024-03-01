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
const customFields = {
  'demographic.age': 'Int',
};
Object.entries(customFields).forEach(([field, type]) => {
  const [category, fieldName] = field.split('.');
  if (!dbSchema[category]) {
    dbSchema[category] = {};
  }
  dbSchema[category][fieldName] = type;
});

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
    operator: { enum: ['AND', 'OR', 'NOT_AND', 'NOT_OR'] },
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
    logger.error(JSON.stringify(validate.errors, null, 2));
    throw new Error('Invalid query');
  }
  return true;
}

function sanitizeCohortQuery(queryJson) {
  // for fields that are of type numeric, convert the value to number
  const { operator, children } = queryJson;
  if (children) {
    // non-leaf node
    return {
      operator,
      children: children.map((child) => sanitizeCohortQuery(child)),
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

  return {
    field,
    operator: op,
    value: new_value,
  };
}

const sql_op_map = {
  in: 'IN',
  not_in: 'NOT IN',
  eq: '=',
  neq: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  contains: 'ILIKE',
  not_contains: 'NOT ILIKE',
  starts_with: 'ILIKE',
  ends_with: 'ILIKE',
};

function buildCustomField(field, op, value) {
  const [category, fieldName] = field.split('.');
  if (category === 'demographic' && fieldName === 'age') {
    // datatype is Int
    return Prisma.sql`
    EXISTS (
      SELECT 1 
      FROM demographic t
      WHERE 
        t.participant_id = p.id
        AND extract(year from age(dob)) ${Prisma.raw(sql_op_map[op])} ${value}
    )`;
  }
  throw new Error(`Implementation for custom field not found: ${field}`);
}

function buildField(field, op, value) {
  if (field in customFields) {
    return buildCustomField(field, op, value);
  }
  const [category, fieldName] = field.split('.');
  const sql_op = Prisma.raw(sql_op_map[op]);
  let sql_value = value;
  if (op === 'in' || op === 'not_in') {
    sql_value = Prisma.sql`(${Prisma.join(value)})`;
  }
  if (op === 'contains' || op === 'not_contains') {
    sql_value = Prisma.sql`${`%${value}%`}`;
  }
  if (op === 'starts_with') {
    sql_value = Prisma.sql`${`%${value}`}`;
  }
  if (op === 'ends_with') {
    sql_value = Prisma.sql`${`${value}%`}`;
  }
  return Prisma.sql`
  EXISTS (
    SELECT 1 
    FROM ${Prisma.raw(category)} t
    WHERE 
      t.participant_id = p.id
      AND ${Prisma.raw(fieldName)} ${sql_op} ${sql_value}
  )`;
}

function buildFilters(queryJson) {
  const { operator, children } = queryJson;

  if (children) {
    // non-leaf node
    let negation = Prisma.empty;
    let _operator = operator;
    if (operator === 'NOT_AND') {
      negation = Prisma.raw('NOT');
      _operator = 'AND';
    }
    if (operator === 'NOT_OR') {
      negation = Prisma.raw('NOT');
      _operator = 'OR';
    }
    const query = Prisma.join(children.map((child) => buildFilters(child)), ` ${_operator} `);
    return Prisma.sql`${negation}(${query})`;
  }

  // leaf node
  const { field, operator: op, value } = queryJson;
  return buildField(field, op, value);
}

function buildQuery(query, { count = false } = {}) {
  const select = Prisma.raw(count ? 'COUNT(p.id) as count' : 'p.id');
  return Prisma.sql`
  SELECT ${select}
  FROM participant p
  WHERE ${buildFilters(query)}
  `;
}

module.exports = {
  validateCohortQuery,
  buildCohortQuery: buildQuery,
  sanitizeCohortQuery,
};
