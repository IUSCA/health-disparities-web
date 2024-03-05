const Ajv = require('ajv');
const { Prisma } = require('@prisma/client');
const _ = require('lodash/fp');
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
    namespace: { type: 'string' },
    name: { type: 'string', enum: ['phenotype', 'genotype'] },
    version: { type: 'string' },
    query: { $ref: '#/definitions/query' },
    set_operations: {
      type: 'object',
      properties: {
        cohort_ids: {
          type: 'array', items: { type: 'number' }, uniqueItems: true, minItems: 2,
        },
        operators: { type: 'array', items: { enum: ['union', 'intersection', 'difference', 'symmetric_difference'] }, minItems: 1 },
      },
      required: ['cohort_ids', 'operators'],
      additionalProperties: false,
    },
  },
  required: ['namespace', 'name', 'query', 'version'],
  additionalProperties: false,
  definitions: {
    query: {
      type: 'object',
      properties: {
        operator: { enum: ['AND', 'OR', 'NOT_AND', 'NOT_OR'] },
        children: {
          type: 'array',
          items: { anyOf: [{ $ref: '#' }, { $ref: '#/definitions/leafNode' }] },
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

function _sanitizeCohortQuery(queryJson) {
  // for fields that are of type numeric, convert the value to number
  const { operator, children } = queryJson;
  if (children) {
    // non-leaf node
    return {
      operator,
      children: children.map((child) => _sanitizeCohortQuery(child)),
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

function sanitizeCohortQuery(queryJson) {
  return {
    ...queryJson,
    query: _sanitizeCohortQuery(queryJson.query),
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
  is_null: 'IS NULL',
  is_not_null: 'IS NOT NULL',
};

function isUnaryOp(op) {
  return op === 'is_null' || op === 'is_not_null';
}

function buildCustomField(field, op, value) {
  const [category, fieldName] = field.split('.');
  const _value = isUnaryOp(op) ? Prisma.empty : value;
  if (category === 'demographic' && fieldName === 'age') {
    // datatype is Int
    return Prisma.sql`
    EXISTS (
      SELECT 1 
      FROM demographic t
      WHERE 
        t.participant_id = p.id
        AND extract(year from age(dob)) ${Prisma.raw(sql_op_map[op])} ${_value}
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
  if (isUnaryOp(op)) {
    sql_value = Prisma.empty;
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
  const select = Prisma.raw(count ? 'COUNT(p.id) as count' : 'p.id as participant_id');
  return Prisma.sql`
  SELECT ${select}
  FROM participant p
  WHERE ${buildFilters(query)}
  `;
}

function cohortParticipantsQuery(cohort_id) {
  return Prisma.sql`SELECT participant_id FROM cohort_participants WHERE cohort_id = ${cohort_id}`;
}

function combineTwo(q1, q2, operator) {
  const op_map = {
    union: 'UNION',
    intersect: 'INTERSECT',
    difference: 'EXCEPT',
  };
  // union, intersect, difference
  if (operator in op_map) {
    return Prisma.sql`
    (${q1})
    ${Prisma.raw(op_map[operator])}
    (${q2})
  `;
  }

  // symmetric_difference - (A-B) U (B-A)
  if (operator === 'symmetric_difference') {
    return combineTwo(
      combineTwo(q1, q2, 'difference'),
      combineTwo(q2, q1, 'difference'),
      'union',
    );
  }
  throw new Error(`Invalid cohort combination operator: ${operator}`);
}

/**
 * Combines multiple cohort IDs using the specified operators.
 * @param {Array<number>} cohort_ids - An array of cohort IDs.
 * @param {Array<string>} operators - An array of operators.
 * @returns - A prepared statement when evalauted yields the combined cohort participants.
 *
 *
 * Example: combine([1, 2, 3], ['union', 'intersect'])
 * let cohortParticipantsQuery (CPQ) be a function that returns the participants of a cohort
 * Evaluation order:
 * ((CPQ(1) UNION CPQ(2)) INTERSECT CPQ(3))
*/
function combine(cohort_ids, operators) {
  const cpq = cohortParticipantsQuery;
  if (cohort_ids.length === 1) {
    return cpq(cohort_ids[0]);
  }
  if (cohort_ids.length === 2) {
    return combineTwo(cpq(cohort_ids[0]), cpq(cohort_ids[1]), operators[0]);
  }
  const [rest, tail] = [_.initial(cohort_ids), _.last(cohort_ids)];
  const [rest_ops, last_op] = [_.initial(operators), _.last(operators)];
  return combineTwo(combine(rest, rest_ops), cpq(tail), last_op);
}

// TODO: join with user table and return author's data
const cohort_select = Prisma.raw`
select
  id,
  "name",
  query,
  created_at,
  "description",
  metadata,
  updated_at,
  author_id,
  is_locked,
  is_protected,
  is_published,
  array_length(participants, 1) as "size"
`;
// To not return the participants array but the count of participants
// Why? Because the participants array can be very large and we don't need it
function getCohortByIdQuery(id) {
  return Prisma.sql`
    ${cohort_select}
    from
      cohort
    where
      id = ${id}
  `;
}

function searchCohortsQuery({
  name = null, author_id = null, is_published = null, is_locked = null, is_protected = null,
} = {}) {
  const filters = [
    name ? Prisma.sql`name ILIKE ${`%${name}%`}` : null,
    author_id ? Prisma.sql`author_id = ${author_id}` : null,
    is_published ? Prisma.sql`is_published = ${is_published}` : null,
    is_locked ? Prisma.sql`is_locked = ${is_locked}` : null,
    is_protected ? Prisma.sql`is_protected = ${is_protected}` : null,
  ].filter((x) => x);

  const where = filters.length ? Prisma.join(filters, ' AND ') : Prisma.raw('1 = 1');
  return Prisma.sql`
    ${cohort_select}
    from
      cohort
    where
      ${where}
  `;
}

module.exports = {
  validateCohortQuery,
  buildCohortQuery: buildQuery,
  sanitizeCohortQuery,
  CATEGORIES: tables,
  combineCohortQuery: combine,
  getCohortByIdQuery,
  searchCohortsQuery,
};
