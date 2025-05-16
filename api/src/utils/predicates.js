const not = (predicate) => (value) => !predicate(value);
const allPass = (predicates) => (value) => predicates.every((predicate) => predicate(value));
const anyPass = (predicates) => (value) => predicates.some((predicate) => predicate(value));
const nonePass = (predicates) => (value) => predicates.every((predicate) => !predicate(value));
const xor = (a, b) => (value) => !!a(value) !== !!b(value);
const always = async () => true;
const never = async () => false;

module.exports = {
  not,
  allPass,
  anyPass,
  nonePass,
  always,
  never,
  xor,
};
