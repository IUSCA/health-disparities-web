const { Prisma } = require('@prisma/client');

/**
 * Retrieves the fields of a specified model that match allowed data types.
 *
 * @param {string} model_name - The name of the model to retrieve fields from.
 * @returns {Object|null} An object where the keys are field names and the values are their types,
 *                        or null if the model is not found.
 *
 * @example
 * // Assuming a model "User" with fields of allowed types:
 * const fields = getFieldsWithType("User");
 * // Output: { id: 'Int', name: 'String', createdAt: 'DateTime' }
 */
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
