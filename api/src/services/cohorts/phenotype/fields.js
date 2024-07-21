const { getFieldsWithType } = require('../../db');

const tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];
const customFields = {
  'demographic.age': 'Int',
};

const dbSchema = tables.reduce(
  (acc, table) => {
    acc[table] = getFieldsWithType(table);
    return acc;
  },
  {},
);

// Add custom fields that are not in the database schema but are used in the query
Object.entries(customFields).forEach(([field, type]) => {
  const [category, fieldName] = field.split('.');
  if (!dbSchema[category]) {
    dbSchema[category] = {};
  }
  dbSchema[category][fieldName] = type;
});

module.exports = {
  CATEGORIES: tables,
  dbSchema,
  customFields,
};
