// const Ajv = require('ajv');

const { validate } = require('./model');

// const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

describe('Combination Query Schema Validation', () => {
  it('should return true for a valid combination query', () => {
    const body = {
      cohort_ids: ['cohort1_id', 'cohort2_id'],
      operators: ['union'],
    };

    const isValid = validate(body);
    expect(isValid).toBe(true);
  });

  it('should throw an error for an empty query', () => {
    const body = {};

    expect(() => validate(body)).toThrow('Invalid query');
  });

  it('should throw an error for an invalid query', () => {
    const body = {
      filters: {},
      ranges: [],
      zygosities: [],
    };

    expect(() => validate(body)).toThrow('Invalid query');
  });
});
