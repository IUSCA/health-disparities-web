const assert = require('assert');
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
    assert.strictEqual(isValid, true);
  });

  it('should throw an error for an empty query', () => {
    const body = {};

    try {
      validate(body);
      assert.fail('Expected an error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message, 'Invalid query');
    }
  });

  it('should throw an error for an invalid query', () => {
    const body = {
      filters: {},
      ranges: [],
      zygosities: [],
    };

    try {
      validate(body);
      assert.fail('Expected an error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message, 'Invalid query');
    }
  });
});
