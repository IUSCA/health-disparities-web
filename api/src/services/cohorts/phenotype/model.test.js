const assert = require('assert');

const { validate, sanitize } = require('./model');

describe('Phenotype Query Schema Validation', () => {
  it('should return true for a valid combination query', () => {
    const body = {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'demographic.age',
            operator: 'gt',
            value: '10',
          },
          {
            field: 'demographic.age',
            operator: 'lt',
            value: '30',
          },
        ],
      },
      snapshot_id: 1,
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
      cohort_ids: ['cohort1_id', 'cohort2_id'],
    };

    try {
      validate(body);
      assert.fail('Expected an error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message, 'Invalid query');
    }
  });

  it('should return a sanitized query', () => {
    const body = {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'demographic.age',
            operator: 'gt',
            value: '10',
          },
          {
            field: 'demographic.age',
            operator: 'lt',
            value: '30',
          },
        ],
      },
      snapshot_id: 1,
    };

    const sanitizedBody = sanitize(body);
    assert.deepStrictEqual(sanitizedBody, {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'demographic.age',
            operator: 'gt',
            value: 10,
          },
          {
            field: 'demographic.age',
            operator: 'lt',
            value: 30,
          },
        ],
      },
      snapshot_id: 1,
    });
  });
});
