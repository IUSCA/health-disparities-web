import { isUnaryOperator } from "../cohortFilters";

/**
 * Returns a default query object.
 * @returns {Object} The default query object.
 */
export function defaultQuery() {
  return { operatorIdentifier: "AND", children: [] };
}

/**
 * Transforms the query object to a standard format.
 * Removes filters with empty values ("", null, []) and removes empty groups.
 * @param {Object} query - The query object to transform.
 * @returns {Object|null} The transformed query object, or null if the input query is falsy.
 */
export function transformQueryForApi(query) {
  if (!query) return null;
  return {
    operator: query.operatorIdentifier,
    children: query.children
      .map((child) => {
        if (child.children) {
          return transformQueryForApi(child);
        }
        return {
          field: child.identifier,
          operator: child.connectorValue,
          value: child.value,
        };
      })
      .filter((child) => {
        if (child.children) {
          return child.children.length > 0;
        }
        // if unary operator, do not validate value, return true
        if (isUnaryOperator(child.operator)) {
          return true;
        }
        // value cannot be null or undefined or empty array or empty string
        // check if value is of array type and then check if it's empty
        return !(
          child.value == null ||
          child.value === "" ||
          (Array.isArray(child.value) && child.value.length === 0)
        );
      }),
  };
}

/**
 * Transforms the stored standardized query object to a format that can be used in the query builder.
 * @param {Object} query - The stored query object to transform.
 * @returns {Object|null} The transformed query object, or null if the input query is falsy.
 */
export function transformStoredQuery(query) {
  if (!query) return null;
  return {
    operatorIdentifier: query.operator,
    children: query.children.map((child) => {
      if (child.children) {
        return transformStoredQuery(child);
      }
      return {
        identifier: child.field,
        connectorValue: child.operator,
        value: child.value,
      };
    }),
  };
}

export function isQueryEmpty(query) {
  const query2 = transformQueryForApi(query);
  return isAPIQueryEmpty(query2);
}

export function isAPIQueryEmpty(query) {
  return !query || query.children.length === 0;
}
