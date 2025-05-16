const { buildCustomField, buildParticipantsQuery } = require('./index');
const { normalizeWhiteSpace } = require('../../../utils');

describe('Phenotype Query Building Validation', () => {
  it('should throw an error for an unknown custom field', () => {
    const field = 'unknown.field';
    const op = 'gt';
    const value = '10';

    expect(() => buildCustomField(field, op, value)).toThrowError(
      new Error('Implementation for custom field not found: unknown.field'),
    );
  });

  it('should return the correct SQL query for searching participants', () => {
    const query = {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'demographic_extended.gender',
            operator: 'in',
            value: [
              'F',
              'M',
            ],
          },
        ],
      },
      snapshot_id: 1,
    };

    const sql = buildParticipantsQuery(query);
    const expected_sql = `
      SELECT p.id as participant_id
      FROM participant p
      WHERE (
      EXISTS (
        SELECT 1
        FROM demographic_extended t
        WHERE
          t.participant_id = p.id
          AND gender IN (?,?)
      ))
    `;
    expect(normalizeWhiteSpace(sql.sql)).toBe(normalizeWhiteSpace(expected_sql));
    expect(sql.values).toEqual(['F', 'M']);
  });
});
