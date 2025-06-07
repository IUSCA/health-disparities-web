const config = require('config');
const cohortModel = require('@/services/cohorts/model');

function applySizeDeidentification(size) {
  if (size === 0) {
    return { size: 0, is_below_min_cohort_size: false };
  }
  const { enabled, min_size } = config.get('cohorts.deidentification.size');
  const is_below_min_cohort_size = enabled && size < min_size;
  return {
    size: is_below_min_cohort_size ? min_size : size,
    is_below_min_cohort_size,
  };
}

function cohortToJSON(cohort) {
  return {
    ...cohort,
    query: cohortModel.toJSON(cohort.query),
    ...applySizeDeidentification(cohort.size),
  };
}

module.exports = {
  cohortToJSON,
  applySizeDeidentification,
};
