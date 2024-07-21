const Ajv = require('ajv');
const _ = require('lodash/fp');
const logger = require('../../logger');

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const schema = {
  type: 'object',
  properties: {
    cohort_ids: {
      type: 'array', items: { type: 'string' }, uniqueItems: true, minItems: 2,
    },
    operators: {
      type: 'array',
      items: { enum: ['union', 'intersection', 'difference', 'symmetric_difference'] },
      minItems: 1,
    },
  },
  required: ['cohort_ids', 'operators'],
  additionalProperties: false,
};

const validateSchema = ajv.compile(schema);
function validate(query_body) {
  const valid = validateSchema(query_body);
  if (!valid) {
    logger.error(JSON.stringify(validateSchema.errors, null, 2));
    throw new Error('Invalid query', validateSchema.errors);
  }
  return true;
}

module.exports = {
  schema,
  toJSON: _.identity,
  validate,
  sanitize: _.identity,
};
