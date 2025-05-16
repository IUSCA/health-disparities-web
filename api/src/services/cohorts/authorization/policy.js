const { ROLES, CV } = require('./constants');
const { ifInReview, ifReferenced, ifArchived } = require('./utils');
const StateMachine = require('../../stateMachine');
const { always, nonePass, not } = require('../../../utils/predicates');

const permissions = {
  [ROLES.USER]: { // portal role is "user" and is not the author
    view: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    search: { [CV.PUBLIC]: always },
    clone: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    derive: { [CV.UNLISTED]: not(ifArchived), [CV.PUBLIC]: not(ifArchived) },
    request: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
  },
  [ROLES.AUTHOR]: { // is the author; can have any portal role
    view: { [CV.PRIVATE]: always, [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    search: { [CV.PRIVATE]: always, [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    update: { [CV.PRIVATE]: not(ifArchived) },
    delete: { [CV.PRIVATE]: not(ifReferenced) },
    clone: { [CV.PRIVATE]: always, [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    derive: { [CV.PRIVATE]: not(ifArchived), [CV.UNLISTED]: not(ifArchived), [CV.PUBLIC]: not(ifArchived) },
    archive: { [CV.PRIVATE]: not(ifArchived), [CV.UNLISTED]: not(ifArchived) },
    unarchive: { [CV.PRIVATE]: ifArchived, [CV.UNLISTED]: ifArchived },
    request: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
  },
  [ROLES.ADMIN]: { // portal role is "operator" / "admin" and is not the author
    view: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    search: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    delete: { [CV.UNLISTED]: nonePass([ifInReview, ifReferenced]), [CV.PUBLIC]: nonePass([ifInReview, ifReferenced]) },
    clone: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    derive: { [CV.UNLISTED]: not(ifArchived), [CV.PUBLIC]: not(ifArchived) },
    archive: { [CV.PUBLIC]: not(ifArchived) },
    unarchive: { [CV.PUBLIC]: ifArchived },
    request: { [CV.UNLISTED]: always, [CV.PUBLIC]: always },
    publish: { [CV.UNLISTED]: always },
    unpublish: { [CV.PUBLIC]: always },
  },
};

const transitions = [
  { from: CV.PRIVATE, to: CV.UNLISTED, roles: [ROLES.AUTHOR] },
  { from: CV.UNLISTED, to: CV.PUBLIC, roles: [ROLES.ADMIN] },
  {
    from: CV.UNLISTED,
    to: CV.PRIVATE,
    roles: [ROLES.AUTHOR],
    guard: nonePass([ifInReview, ifReferenced]),
  },
  { from: CV.PUBLIC, to: CV.UNLISTED, roles: [ROLES.ADMIN] },
];
const visibilityFsm = new StateMachine({
  states: Object.values(CV),
  transitions,
});

module.exports = {
  ROLES, CV, permissions, visibilityFsm,
};
