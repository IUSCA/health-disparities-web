export function isUnaryOperator(operator) {
  return ["is_null", "is_not_null"].includes(operator);
}
