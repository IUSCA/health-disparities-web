const assert = require('assert');
const { buildCustomField, buildParticipantsQuery } = require('./index');
const { normalizeWhiteSpace } = require('../../../utils');

describe('Phenotype Query Building Validation', () => {
  it('should return the correct SQL query for a custom field', () => {
    const field = 'demographic.age';
    const op = 'gt';
    const value = '10';

    const sql = buildCustomField(field, op, value);

    const expected_sql = `
    EXISTS (
      SELECT 1 
      FROM demographic t
      WHERE 
        t.participant_id = p.id
        AND extract(year from age(dob)) > ?
    )`;

    assert.strictEqual(normalizeWhiteSpace(sql.sql), normalizeWhiteSpace(expected_sql));
    assert.deepEqual(sql.values, [10]);
  });

  it('should throw an error for an unknown custom field', () => {
    const field = 'unknown.field';
    const op = 'gt';
    const value = '10';

    assert.throws(() => buildCustomField(field, op, value), {
      name: 'Error',
      message: 'Implementation for custom field not found: unknown.field',
    });
  });

  it('should return the correct SQL query for searching participants', () => {
    const query = {
      filters: {
        operator: 'AND',
        children: [
          {
            field: 'demographic.gender',
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
        FROM demographic t
        WHERE
          t.participant_id = p.id
          AND gender IN (?,?)
      ))
    `;
    assert.strictEqual(normalizeWhiteSpace(sql.sql), normalizeWhiteSpace(expected_sql));
    assert.deepEqual(sql.values, ['F', 'M']);
  });
});
