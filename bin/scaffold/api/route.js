const express = require('express');
const createError = require('http-errors');

let { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Useful imports for middleware
// const logger = require('../services/logger');
// const { query, body } = require('express-validator');
// const { validate, addSortSantizer } = require('../middleware/validators');

const asyncHandler = require('../middleware/asyncHandler');
const { accessControl } = require('../middleware/auth');


const isPermittedTo = accessControl('MODEL');
const router = express.Router();

// CREATE
router.post('/', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.create(req.body);
    res.json(result);
  }),
);

router.post('/all', isPermittedTo('create', false), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.createMany(req.body);
    res.json(result);
  }),
);


// READ
router.get('/', isPermittedTo('read', false), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.findMany(req.query.sort);
    return res.json(result);
  }),
);

router.get('/:id', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.findUnique({where: {id: parseInt(req.params.id)}})
    if (result) { return res.json(result); }
    return next(createError.NotFound());
  }),
);

router.get('/mine', isPermittedTo('read'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const user_id = get_current_user(req, res);

    const result = await prisma.MODEL.findUnique({where: {user_id: parseInt(user_id)}})
    if (result) { return res.json(result); }
    return next(createError.NotFound());
  }),
);



// UPDATE
router.put('/:id', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.update({ where: { id: req.params.id}, data: req.body});
    res.json(result);
  }),
);

router.put('/all', isPermittedTo('update'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.updateMany({ data: req.body});
    res.json(result);
  }),
);



// DELETE
router.delete('/:id', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.delete({ where: {id: req.params.id}});
    res.json(result);
  }),
);

router.delete('/all', isPermittedTo('delete'), asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['MODEL']
    const result = await prisma.MODEL.deleteMany({ where: {id: req.params.id}});
    res.json(result);
  }),
);

module.exports = router;