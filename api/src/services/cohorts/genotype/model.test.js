const assert = require('assert');

const { validate, sanitize } = require('./model');

describe('Genotype Query Schema Validation', () => {
  it('should return true for a valid combination query', () => {
    const body = {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'stats.allele_number',
            operator: 'gt',
            value: '10',
          },
          {
            field: 'stats.allele_number',
            operator: 'lt',
            value: '30',
          },
        ],
      },
      ranges: [{
        type: 'region',
        value: {
          chr: '1',
          start: 1,
          end: 100,
        },
      }, {
        type: 'variant',
        value: {
          chr: '1',
          position: 1,
          ref: 'A',
          alt: 'T',
        },
      }],
      zygosities: ['HOM', 'HET'],
      snapshot_id: 1,
      source_id: 1,
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

  it('should return a sanitized query', () => {
    const body = {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'stats.allele_number',
            operator: 'gt',
            value: '10',
          },
          {
            field: 'stats.allele_number',
            operator: 'lt',
            value: '30',
          },
        ],
      },
      ranges: [{
        type: 'region',
        value: {
          chr: '1',
          start: 1,
          end: 100,
        },
      }, {
        type: 'variant',
        value: {
          chr: '1',
          position: 1,
          ref: 'A',
          alt: 'T',
        },
      }],
      zygosities: ['HOM', 'HET'],
      snapshot_id: 1,
      source_id: 1,
    };

    const sanitizedBody = sanitize(body);
    assert.deepStrictEqual(sanitizedBody, {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'stats.allele_number',
            operator: 'gt',
            value: 10,
          },
          {
            field: 'stats.allele_number',
            operator: 'lt',
            value: 30,
          },
        ],
      },
      ranges: [{
        type: 'region',
        value: {
          chr: 1,
          start: 1,
          end: 100,
        },
      }, {
        type: 'variant',
        value: {
          chr: 1,
          position: 1,
          ref: 'A',
          alt: 'T',
        },
      }],
      zygosities: [0, 1],
      snapshot_id: 1,
      source_id: 1,
    });
  });
});
