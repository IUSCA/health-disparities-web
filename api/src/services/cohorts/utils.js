const cohortModel = require('@/services/cohorts/model');

function cohortToJSON(cohort) {
  return {
    ...cohort,
    query: cohortModel.toJSON(cohort.query),
  };
}

module.exports = {
  cohortToJSON,
};
