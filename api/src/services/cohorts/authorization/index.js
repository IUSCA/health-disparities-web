const {
  permissions, visibilityFsm, searchableStates,
} = require('./policy');

const { getUserRoles, getPortalRole } = require('./utils');

function canPerformAction(action, cohort, user) {
  const cohortVisibility = cohort.visibility;
  const roles = getUserRoles(user, cohort);

  // eslint-disable-next-line no-restricted-syntax
  for (const role of roles) {
    const ruleFn = permissions[role]?.[action]?.[cohortVisibility];
    if (ruleFn) {
      const result = ruleFn({ cohort, user });
      return Boolean(result);
    }
  }
  return false;
}

function canChangeVisibility({
  from, to, cohort, user,
}) {
  const userRoles = getUserRoles(user, cohort);

  visibilityFsm.setState(from);
  return userRoles.some((r) => visibilityFsm.canTransition({ to, role: r, context: { cohort, user } }));
}

function getPossibleActions(cohort, user) {
  const cohortVisibility = cohort.visibility;
  const roles = getUserRoles(user, cohort);
  const actions = new Set();

  // Iterate through each role, then through each action for that role,
  // and check if the user is permitted to perform the action.
  // Collect all permitted actions into a single set.

  roles.forEach((role) => {
    const roleActions = Object.keys(permissions[role]);
    roleActions.forEach((action) => {
      const ruleFn = permissions[role]?.[action]?.[cohortVisibility];
      if (ruleFn) {
        const result = ruleFn({ cohort, user });
        if (result) {
          actions.add(action);
        }
      }
    });
  });

  return [...actions];
}

function getSearchableStates(user) {
  const role = getPortalRole(user);
  return searchableStates[role] || [];
}

module.exports = {
  canPerformAction,
  canChangeVisibility,
  getPossibleActions,
  // getTransitionEffect,
  getSearchableStates,
};
