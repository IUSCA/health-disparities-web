const { validate, sanitize } = require('./model');

describe('Query Validation', () => {
  test('should return true for a valid combination query', () => {
    const query = {
      schema: {
        name: 'combination',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
        cohort_ids: ['cohort1_id', 'cohort2_id'],
        operators: ['union'],
      },
    };

    expect(validate(query)).toBe(true);
  });

  test('should return true for a valid phenotype query', () => {
    const query = {
      schema: {
        name: 'phenotype',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
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
      },
    };

    expect(validate(query)).toBe(true);
  });

  test('should return true for a valid genotype query', () => {
    const query = {
      schema: {
        name: 'genotype',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
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
      },
    };
    expect(validate(query)).toBe(true);
  });

  test('should throw an error for an empty query', () => {
    const body = {};
    expect(() => validate(body)).toThrow('Invalid query');
  });

  test('should throw an error for an invalid query', () => {
    const body = {
      cohort_ids: ['cohort1_id', 'cohort2_id'],
    };
    expect(() => validate(body)).toThrow('Invalid query');
  });

  test('should return a sanitized combination query', () => {
    const query = {
      schema: {
        name: 'combination',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
        cohort_ids: ['cohort1_id', 'cohort2_id'],
        operators: ['union'],
      },
    };

    expect(sanitize(query)).toEqual(query);
  });

  test('should return a sanitized phenotype query', () => {
    const query = {
      schema: {
        name: 'phenotype',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
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
      },
    };

    expect(sanitize(query)).toEqual({
      schema: {
        name: 'phenotype',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
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
      },
    });
  });

  test('should return a sanitized genotype query', () => {
    const query = {
      schema: {
        name: 'genotype',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
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
      },
    };

    expect(sanitize(query)).toEqual({
      schema: {
        name: 'genotype',
        namespace: 'edu.iu.biobank',
        version: '1.0.0',
      },
      body: {
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
      },
    });
  });
});
