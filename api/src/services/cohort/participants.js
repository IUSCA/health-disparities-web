const { Prisma } = require('@prisma/client');
const { customFields } = require('./fields');

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

function buildParticipantsQuery(query, { count = false } = {}) {
  const select = Prisma.raw(count ? 'COUNT(p.id) as count' : 'p.id as participant_id');
  return Prisma.sql`
  SELECT ${select}
  FROM participant p
  WHERE ${buildFilters(query)}
  `;
}

module.exports = {
  buildParticipantsQuery,
};
