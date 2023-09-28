const express = require('express');
const { param, query } = require('express-validator');

const { validate } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');
const sql = require('../variant_db');

const isPermittedTo = accessControl('variant');
const router = express.Router();

const decode_map = {
  0: '0|0',
  1: '0|1',
  2: '1|0',
  3: '1|1',
  4: '0/1',
  6: '1/1',
};

router.get(
  '/:chromosome',
  isPermittedTo('read'),
  validate([
    param('chromosome').isInt().toInt(),
    query('start').isInt().toInt(),
    query('end').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['Variants']
    const result = await sql`
    select chromosome, "position", reference, alternate, idxs.genotype_enc, array_agg(domain_id) as subjects from
    (
      select chromosome, "position", reference, alternate,
        unnest(genotype) as genotype_enc,
        generate_subscripts(genotype, 1) as subject_id
      from
        variant vc
      where
        chromosome = ${req.params.chromosome} and
        "position" between ${req.query.start} and ${req.query.end}
    ) as idxs
    join subject s on s.id = idxs.subject_id
    where idxs.genotype_enc != 0 and idxs.genotype_enc is not null
    group by chromosome, "position", reference, alternate, idxs.genotype_enc
    `;
    const _res = result.map((r) => {
      const { genotype_enc, ...rest } = r;
      return {
        genotype: decode_map[genotype_enc] || genotype_enc,
        ...rest,
      };
    });
    res.json(_res);
  }),
);

module.exports = router;
