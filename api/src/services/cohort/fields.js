const { Prisma } = require('@prisma/client');

const tables = ['demographic', 'lab', 'covid_test', 'covid_vax', 'dx', 'hospital', 'medication'];
const customFields = {
  'demographic.age': 'Int',
};

const getFieldsWithType = (model_name) => {
  // types
  const allowedTypes = ['Int', 'String', 'DateTime', 'Decimal', 'Boolean', 'Float', 'BigInt'];

  // Get the metadata for all models
  const { models } = Prisma.dmmf.datamodel;

  // Find the specific model
  const model = models.find((m) => m.name === model_name);

  // If it's not empty return the fields as an object
  if (model) {
    const fields = model.fields
      .filter((field) => allowedTypes.includes(field.type))
      .reduce((acc, field) => {
        acc[field.name] = field.type;
        return acc;
      }, {});
    // console.log(`fields = ${JSON.stringify(fields)}`)
    return fields;
  }
  return null;
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
  getFieldsWithType,
};
