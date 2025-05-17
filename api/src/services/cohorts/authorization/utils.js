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

const ifReferenced = ({ cohort }) => cohort.is_referenced;
const ifInReview = ({ cohort }) => cohort.in_review;
const ifArchived = ({ cohort }) => cohort.is_archived;
const ifAuthor = ({ cohort, user }) => cohort.author_username === user.username;

module.exports = {
  getUserRoles,
  ifReferenced,
  ifInReview,
  ifArchived,
  ifAuthor,
  getPortalRole,
};
