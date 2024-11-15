const Ajv = require('ajv');
const logger = require('../logger');

const combinationModel = require('./combination/model');
const genotypeModel = require('./genotype/model');
const phenotypeModal = require('./phenotype/model');

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

const PHENOTYPE = 'phenotype';
const GENOTYPE = 'genotype';
const COMBINATION = 'combination';

// Add custom format to validate the "field" property
// ajv.addFormat('customFieldFormat', validateField);

const schema = {
  type: 'object',
  properties: {
    schema: {
      type: 'object',
      properties: {
        namespace: { type: 'string' },
        name: { type: 'string', enum: [PHENOTYPE, GENOTYPE, COMBINATION] },
        version: { type: 'string' },
      },
      required: ['namespace', 'name', 'version'],
    },
    body: {
      type: 'object',
    },
  },
  required: ['schema', 'body'],
  additionalProperties: false,
};

const validateSchema = ajv.compile(schema);
function validate(query) {
  const valid = validateSchema(query);
  if (!valid) {
    logger.error(JSON.stringify(validateSchema.errors, null, 2));
    throw new Error('Invalid query', validateSchema.errors);
  }
  if (query.schema.name === PHENOTYPE) {
    return phenotypeModal.validate(query.body);
  }
  if (query.schema.name === GENOTYPE) {
    return genotypeModel.validate(query.body);
  }
  if (query.schema.name === COMBINATION) {
    return combinationModel.validate(query.body);
  }
  throw new Error(`Invalid query name: ${schema.name}`);
}

function sanitize(query) {
  if (query.schema.name === PHENOTYPE) {
    return {
      schema: query.schema,
      body: phenotypeModal.sanitize(query.body),
    };
  } if (query.schema.name === GENOTYPE) {
    return {
      schema: query.schema,
      body: genotypeModel.sanitize(query.body),
    };
  } if (query.schema.name === COMBINATION) {
    return {
      schema: query.schema,
      body: combinationModel.sanitize(query.body),
    };
  }
  throw new Error(`Invalid query name: ${schema.name}`);
}

function toJSON(query) {
  if (query.schema.name === PHENOTYPE) {
    return {
      schema: query.schema,
      body: phenotypeModal.toJSON(query.body),
    };
  } if (query.schema.name === GENOTYPE) {
    return {
      schema: query.schema,
      body: genotypeModel.toJSON(query.body),
    };
  } if (query.schema.name === COMBINATION) {
    return {
      schema: query.schema,
      body: combinationModel.toJSON(query.body),
    };
  }
  throw new Error(`Invalid query name: ${schema.name}`);
}

module.exports = {
  PHENOTYPE,
  GENOTYPE,
  COMBINATION,
  validate,
  sanitize,
  toJSON,
  querySchema: schema,
};
