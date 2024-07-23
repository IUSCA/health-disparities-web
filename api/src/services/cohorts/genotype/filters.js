const { Prisma } = require('@prisma/client');
const { SQL_OP_MAP, isUnaryOp } = require('../common');

/**
 * Builds a SQL query for a given field, operator, and value.
 *
 * @param {string} field - The field to filter on.
 * @param {string} op - The operator to use for the filter.
 * @param {any} value - The value to filter by.
 * @returns {Prisma.Sql} - The SQL query for the filter.
 */
function buildField(field, op, value) {
  const sql_op = Prisma.raw(SQL_OP_MAP[op]);
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
  const _field = field.split('.')[1];
  const field_sql = Prisma.raw(_field);
  return Prisma.sql`${field_sql} ${sql_op} ${sql_value}`;
}

/**
 * Builds the filters based on the provided query JSON.
 *
 * @param {object} queryJson - The query JSON object.
 * @returns {object} - The built filters as Prisma.Sql.
 */
function buildFiltersSQL(queryJson) {
  // console.log({ queryJson });
  const { operator, children } = queryJson;
  if (children) {
    if (children.length === 0) {
      return Prisma.empty;
    }
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
    const query = Prisma.join(children.map((child) => buildFiltersSQL(child)), ` ${_operator} `);
    return Prisma.sql`${negation}(${query})`;
  }

  // leaf node
  const {
    field, operator: op, value,
  } = queryJson;
  return buildField(field, op, value);
}

module.exports = {
  buildFiltersSQL,
};
