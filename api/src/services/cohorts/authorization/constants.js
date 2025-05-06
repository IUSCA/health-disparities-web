const ROLES = {
  ADMIN: 'admin',
  AUTHOR: 'author',
  USER: 'user',
};

const CV = {
  PRIVATE: 'PRIVATE',
  UNLISTED: 'UNLISTED',
  PUBLISHED: 'PUBLISHED',
};

const always = async () => true;
const never = async () => false;

module.exports = {
  ROLES,
  CV,
  always,
  never,
};
