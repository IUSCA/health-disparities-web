/* eslint-disable lodash-fp/prefer-constant */
const { ROLES } = require('./constants');

function getPortalRole(user) {
  if (user.roles.includes('admin') || user.roles.includes('operator')) return ROLES.ADMIN;
  return ROLES.USER;
}

function getUserRoles(user, cohort) {
  const roles = [getPortalRole(user)];
  if (cohort.author_username === user.username) roles.push(ROLES.AUTHOR);
  return roles;
}

// This should eventually call a real implementation.
async function hasDependents(cohort) {
  // eslint-disable-next-line no-console
  console.log('hasDependents not implemented', cohort);
  return false;
}

const ifUnused = async ({ cohort }) => !(await hasDependents(cohort));

module.exports = {
  getUserRoles,
  ifUnused,
};
