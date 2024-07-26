export function isUnaryOperator(operator) {
  return ["is_null", "is_not_null"].includes(operator);
}

export const operators = [
  {
    identifier: "select",
    options: [
      {
        key: "in",
        label: "is one of",
      },
      {
        key: "not_in",
        label: "is none of",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "asyncSelect",
    options: [
      {
        key: "in",
        label: "is one of",
      },
      {
        key: "not_in",
        label: "is none of",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "number",
    options: [
      {
        key: "eq",
        label: "=",
      },
      {
        key: "neq",
        label: "!=",
      },
      {
        key: "gt",
        label: ">",
      },
      {
        key: "lt",
        label: "<",
      },
      {
        key: "gte",
        label: ">=",
      },
      {
        key: "lte",
        label: "<=",
      },
      {
        key: "between",
        label: "between",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "text",
    options: [
      {
        key: "eq",
        label: "is",
      },
      {
        key: "neq",
        label: "is not",
      },
      {
        key: "contains",
        label: "contains",
      },
      {
        key: "not_contains",
        label: "not contains",
      },
      {
        key: "starts_with",
        label: "starts with",
      },
      {
        key: "ends_with",
        label: "ends with",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "date",
    options: [
      {
        key: "eq",
        label: "is",
      },
      {
        key: "neq",
        label: "is not",
      },
      {
        key: "gt",
        label: "after",
      },
      {
        key: "lt",
        label: "before",
      },
      {
        key: "gte",
        label: "on or after",
      },
      {
        key: "lte",
        label: "on or before",
      },
      {
        key: "between",
        label: "between",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
];

export function filterId(category, name) {
  return `${category}.${name}`;
}

export function flatten(filters) {
  return filters.flatMap((category) =>
    category.filters.map((filter) => {
      return {
        ...filter,
        category: category.key,
        id: filterId(category.key, filter.key),
      };
    }),
  );
}
