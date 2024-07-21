const SQL_OP_MAP = {
  in: 'IN',
  not_in: 'NOT IN',
  eq: '=',
  neq: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  between: 'BETWEEN',
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

module.exports = {
  SQL_OP_MAP,
  isUnaryOp,
};
