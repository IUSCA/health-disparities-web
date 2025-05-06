const { ROLES, CV, always } = require('./constants');
const { ifUnused } = require('./utils');
const StateMachine = require('../../stateMachine');

const permissions = {
  editMetadata: {
    [CV.PRIVATE]: {
      [ROLES.AUTHOR]: always,
    },
    [CV.UNLISTED]: {
      [ROLES.AUTHOR]: always,
      [ROLES.ADMIN]: always,
    },
    [CV.PUBLISHED]: {
      [ROLES.ADMIN]: always,
    },
  },
  editQuery: {
    [CV.PRIVATE]: {
      [ROLES.AUTHOR]: always,
    },
    [CV.UNLISTED]: {},
    [CV.PUBLISHED]: {},
  },
  read: {
    [CV.PRIVATE]: {
      [ROLES.AUTHOR]: always,
    },
    [CV.UNLISTED]: {
      [ROLES.AUTHOR]: always,
      [ROLES.ADMIN]: always,
      [ROLES.USER]: always,
    },
    [CV.PUBLISHED]: {
      [ROLES.AUTHOR]: always,
      [ROLES.ADMIN]: always,
      [ROLES.USER]: always,
    },
  },
  delete: {
    [CV.PRIVATE]: {
      [ROLES.AUTHOR]: ifUnused,
    },
    [CV.UNLISTED]: {
      [ROLES.AUTHOR]: ifUnused,
      [ROLES.ADMIN]: ifUnused,
    },
    [CV.PUBLISHED]: { [ROLES.ADMIN]: ifUnused },
  },
};

const transitions = [
  { from: CV.PRIVATE, to: CV.UNLISTED, roles: [ROLES.AUTHOR] },
  { from: CV.UNLISTED, to: CV.PUBLISHED, roles: [ROLES.ADMIN] },
  { from: CV.UNLISTED, to: CV.PRIVATE, roles: [ROLES.ADMIN] },
];
const visibilityFsm = StateMachine({
  states: Object.values(CV),
  transitions,
});

module.exports = {
  ROLES, CV, permissions, visibilityFsm,
};
