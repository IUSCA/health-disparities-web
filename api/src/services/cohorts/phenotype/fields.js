const { getFieldsWithType } = require('../../db');

const tables = ['demographic_extended', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication',
  'drug_screen', 'vaccination', 'participant_genotype'];
const customFields = {
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
