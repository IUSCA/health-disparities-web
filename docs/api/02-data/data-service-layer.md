# **Data Service Layer: Conventions and Design Patterns**

## **Purpose**

Define robust, clean, and consistent patterns for implementing the data service layer in a Node.js backend, ensuring maintainability, composability, and transaction compatibility.



## **File and Function Structure**

### **File Organization**

* Use domain-based structure:

  ```
  src/services/<domain>/<operation>.js
  e.g., src/services/cohorts/search.js
  ```

### **Function Naming**

* Name exported function based on what it does, *not* the domain.

  * ✅ `search`
  * ❌ `cohortSearch` (redundant in `cohorts/search.js`)

* When returning a higher-order function:

  * Use `createSearch`, `createUpdateFn`, etc. inside the module
  * Export as `search`, `update`, etc.



## **Function Signature**

### **Recommended Form**

Use a higher-order function that returns an async function which accepts a Prisma client:

```js
function createSearch({ user, queryParams, filters = {}, include = {} }) {
  return async (prisma) => {
    // ...
  };
}
```

### **Parameters**

| Param         | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| `user`        | Authenticated user; used for access control logic                 |
| `queryParams` | Required: sort, pagination, etc.                                  |
| `filters`     | Optional: domain-specific filters (e.g., visibility, search term) |
| `include`     | Optional: Prisma `include` object for relational data             |



## **Prisma Client Handling**

### **Accept Client as Last Parameter**

* Always accept the Prisma client (`prisma` or `tx`) as the argument to the returned function.
* Allows transactional use via:

  ```js
  await prisma.$transaction([
    createSearch({...})(prisma),
    otherOp(...)(prisma)
  ]);
  ```



## **Include and Select Patterns**

### **Use Native Prisma Shape**

* Allow consumers to pass Prisma-compatible `include` objects.

  ```js
  include: {
    author: true,
    requests: { select: { id: true } }
  }
  ```

### **Avoid Booleans for Includes**

* Don’t use flags like `should_include_author`. This adds unnecessary branching and reduces flexibility.



## **Query Construction**

### **Build `where` Separately**

* Compose `where` clause step-by-step, based on `filters`:

  ```js
  const where = {
    AND: [
      { is_temp: false },
      { OR: [...accessControlConditions] },
    ],
  };

  if (filters.visibility) {
    where.AND.push({ visibility: filters.visibility });
  }
  ```

* Prefer extracting this into a helper for testability:

  ```js
  const where = buildWhereClause(user, filters);
  ```



## **Default Behaviors**

### **Defaults Should Be Inside Service**

* Example: `include: { author: true }` should be set in the service, not by the caller.
* Merge user includes into defaults:

  ```js
  const include = {
    ...defaultInclude,
    ...callerInclude,
  };
  ```



## **Readability and Maintainability**

### **Avoid Over-Engineering**

* Keep logic flat; don’t deeply nest or create custom DSLs for filters or includes.

### **DRY with Reason**

* Extract helpers only when reused or tested separately.
* Prefer readability over premature abstraction.



## **Testing & Mocking**

* Outer function can be tested independently of Prisma:

  ```js
  const fn = createSearch({ user, queryParams });
  const results = await fn(mockPrisma);
  ```

* Enables mocking `findMany` and verifying arguments.



## **Error Handling**

* Let service functions throw and handle errors at the controller layer.
* Wrap exceptions if necessary to attach domain-specific error metadata.



## **Example**

```js
// src/services/cohorts/search.js
function createSearch({ user, queryParams, filters = {}, include = {} }) {
  return async (prisma) => {
    const where = {
      AND: [
        {
          OR: [
            { author_username: user.username },
            { visibility: { in: getSearchableStates(user) } },
          ],
        },
        { is_temp: false },
      ],
    };

    if (filters.visibility) {
      where.AND.push({ visibility: filters.visibility });
    }

    if (filters.search_term) {
      where.AND.push({
        OR: [
          { name: { contains: filters.search_term, mode: 'insensitive' } },
          { description: { contains: filters.search_term, mode: 'insensitive' } },
        ],
      });
    }

    const defaultInclude = { author: true };

    return prisma.cohort_view.findMany({
      where,
      include: { ...defaultInclude, ...include },
      orderBy: { [queryParams.sort_by]: queryParams.sort_order },
      take: queryParams.limit,
      skip: queryParams.offset,
    });
  };
}

module.exports = { search: createSearch };
```



## Summary

| Principle      | Rule                                           |
| -------------- | ---------------------------------------------- |
| KISS           | No unnecessary abstraction or flags            |
| DRY            | Reuse helper logic, don't duplicate filters    |
| Prisma-aligned | Use Prisma-native `include`, `select`, `where` |
| Flexible       | Curry for transaction support                  |
| Descriptive    | Clear param names; avoid generic bags of args  |


