const { normalizeWhiteSpace } = require('../../../utils');
const { distinctAnnotationsQuery } = require('./index');

describe('distinctAnnotationsQuery', () => {
  test('should return the correct SQL query for distinct annotations', async () => {
    const field = 'func';
    const source_id = 1;
    const snapshot_id = 2;
    const protocol_id = 3;
    const ranges = [{
      type: 'region',
      value: { chr: 2, start: 100, end: 200 },
    }];

    const sql = await distinctAnnotationsQuery(
      field,
      {
        source_id, snapshot_id, ranges, protocol_id,
      },
    );
    // console.log(sql.sql, sql.values);

    const expected_sql = `
    select func as value, count(*) as count
    from gt_stats_annotations
    where 
    source_id = ?
    AND snapshot_id = ?
    AND protocol_id = ?
    AND ((chr = ? AND position BETWEEN ? AND ?))
    and func is not null
    group by func
    order by count desc`;

    expect(normalizeWhiteSpace(sql.sql)).toBe(normalizeWhiteSpace(expected_sql));
    expect(sql.values).toEqual([1, 2, 3, 2, 100, 200]);
  });

  test('should return the correct SQL query for distinct annotations with multiple ranges', async () => {
    const field = 'func';
    const source_id = 1;
    const snapshot_id = 2;
    const protocol_id = 3;
    const ranges = [
      {
        type: 'region',
        value: { chr: 2, start: 100, end: 200 },
      }, {
        type: 'variant',
        value: {
          chr: 2, position: 300, ref: 'A', alt: 'T',
        },
      },
      {
        type: 'gene',
        value: { name: 'GAB4', regions: [{ chr: 22, start: 16959435, end: 17010722 }] },
      },
    ];

    const expectedQuery = `
    select func as value, count(*) as count
    from gt_stats_annotations
    where
    source_id = ?
    AND snapshot_id = ?
    AND protocol_id = ?
    AND ((chr = ? AND position BETWEEN ? AND ?) 
      OR  (chr = ? AND position = ? AND ref = ? AND alt = ?) 
      OR  (chr = ? AND position BETWEEN ? AND ?))
    and func is not null
    group by func
    order by count desc
    `;

    const sql = await distinctAnnotationsQuery(field, {
      source_id, snapshot_id, ranges, protocol_id,
    });
    // console.log(sql.sql, sql.values);

    expect(normalizeWhiteSpace(sql.sql)).toBe(normalizeWhiteSpace(expectedQuery));
    expect(sql.values).toEqual([
      1, 2, 3,
      2, 100, 200,
      2, 300, 'A',
      'T', 22, 16959435,
      17010722,
    ]);
  });
});
