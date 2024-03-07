const { Prisma } = require('@prisma/client');
const _ = require('lodash/fp');

function cohortParticipantsQuery(cohort_id) {
  // return Prisma.sql`
  // SELECT participant_id FROM cohort_participants WHERE cohort_id = ${cohort_id}
  // `;
  return Prisma.sql`select unnest(participants) as participant_id from cohort c where c.id=${cohort_id}`;
}

function combineTwo(q1, q2, operator) {
  const op_map = {
    union: 'UNION',
    intersection: 'INTERSECT',
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

function combineWrapper({ cohort_ids, operators, count = false }) {
  const sqlQuery = combine(cohort_ids, operators);
  if (count) {
    return Prisma.sql`
    SELECT COUNT(*) as count FROM (${sqlQuery}) as t
    `;
  }
  return sqlQuery;
}

module.exports = {
  combineQuery: combineWrapper,
};
