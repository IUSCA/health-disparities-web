const {
  permissions, visibilityFsm,
} = require('./policyMatrix');

const { getUserRoles } = require('./utils');

async function checkPermission(action, { cohort, user }) {
  const cohortVisibility = cohort.visibility;
  const perms = permissions[action]?.[cohortVisibility] || {};
  const roles = getUserRoles(user, cohort);

  // eslint-disable-next-line no-restricted-syntax
  for (const role of roles) {
    const ruleFn = perms[role];
    if (ruleFn) {
      // eslint-disable-next-line no-await-in-loop
      const result = await ruleFn({ cohort, user });
      return !!result; // Convert to boolean
    }
  }
  return false;
}

async function canEditMetadata(cohort, user) {
  return checkPermission('editMetadata', cohort, user);
}

async function canEditQuery(cohort, user) {
  return checkPermission('editQuery', cohort, user);
}

async function canRead(cohort, user) {
  return checkPermission('read', cohort, user);
}

async function canDelete(cohort, user) {
  return checkPermission('delete', cohort, user);
}

function canChangeVisibility({
  from, to, cohort, user,
}) {
  const userRoles = getUserRoles(user, cohort);

  visibilityFsm.setState(from);
  return userRoles.some((r) => visibilityFsm.canTransition({ to, role: r }));
}

module.exports = {
  canEditMetadata,
  canEditQuery,
  canRead,
  canDelete,
  canChangeVisibility,
};
