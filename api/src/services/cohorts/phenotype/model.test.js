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
    expect(isValid).toBe(true);
  });

  it('should throw an error for an empty query', () => {
    const body = {};

    expect(() => validate(body)).toThrow('Invalid query');
  });

  it('should throw an error for an invalid query', () => {
    const body = {
      cohort_ids: ['cohort1_id', 'cohort2_id'],
    };

    expect(() => validate(body)).toThrow('Invalid query');
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
    expect(sanitizedBody).toEqual({
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
