// asynchronously log the query and its sql
function createLogQuery({
  queryJson, sqlQuery, execution_time, author_username,
}) {
  return (prisma) => prisma.query_analytics.create({
    data: {
      query: queryJson,
      sql: sqlQuery.sql,
      values: sqlQuery.values,
      author_username,
      execution_time,
    },
  });
}

module.exports = {
  createLogQuery,
};
