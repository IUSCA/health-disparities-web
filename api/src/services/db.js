const { Prisma } = require('@prisma/client');

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

module.exports = {
  getFieldsWithType,
};
