const { validate, sanitize } = require('./model');

describe('Genotype Query Schema Validation', () => {
  test('should return true for a valid combination query', () => {
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

    expect(validate(body)).toBe(true);
  });

  test('should throw an error for an empty query', () => {
    const body = {};
    expect(() => validate(body)).toThrow('Invalid query');
  });

  test('should throw an error for an invalid query', () => {
    const body = {
      filters: {},
      ranges: [],
      zygosities: [],
    };
    expect(() => validate(body)).toThrow('Invalid query');
  });

  test('should return a sanitized query', () => {
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

    expect(sanitize(body)).toEqual({
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
