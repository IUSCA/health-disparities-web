export const defultOperators = {
  select: "in",
  number: "eq",
  text: "eq",
  date: "lte",
};

export function defaultQuery() {
  return { operatorIdentifier: "AND", children: [] };
}
