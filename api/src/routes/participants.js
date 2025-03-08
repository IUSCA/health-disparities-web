const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { param, query } = require('express-validator');

const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validators');
const { accessControl } = require('../middleware/auth');
const visualization = require('../services/cohorts/visualization');

const isPermittedTo = accessControl('cohorts');
const router = express.Router();

router.get(
  '/total-count',
  isPermittedTo('read'),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get total count of participants in the database.'
    const total = await prisma.participant.count();

    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    return res.json({ total });
  }),
);

router.get(
  '/',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('limit').default(10).isInt({ min: 1, max: 100 })
      .toInt(),
    query('offset').default(0).isInt({ min: 0 })
      .toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get participants of a cohort.'
    const cohort = await prisma.cohort.findFirstOrThrow({
      where: {
        id: req.query.cohort_id,
      },
    });
    const participant_ids = cohort.participants.slice(
      req.query.offset,
      req.query.offset + req.query.limit,
    );
    const total_count = cohort.participants.length;
    const participants = await prisma.participant.findMany({
      where: {
        id: {
          in: participant_ids,
        },
      },
      include: {
        demographics: true,
      },
    });

    // remove ib_id, study_id and
    // change demographics from array on one object to a simple object
    const _participants = participants.map((participant) => {
      const {
        // eslint-disable-next-line no-unused-vars
        ib_id, study_id, demographics, ...rest
      } = participant;
      return {
        ...rest,
        demographics: demographics?.[0],
      };
    });
    res.json({
      metadata: {
        total_count,
        limit: req.query.limit,
        offset: req.query.offset,
      },
      participants: _participants,
    });
  }),
);

router.get(
  '/aggregate',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('field').isIn(['gender', 'race', 'ethnicity']),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get aggregate of a field for a cohort.'
    const { field, cohort_id } = req.query;

    const sql = visualization.aggregateColumnSQL(cohort_id, field);
    const _rows = await prisma.$queryRaw(sql);

    const distinctValuesWithCounts = _rows.reduce((acc, item) => {
      acc[item[field]] = parseInt(item.count, 10);
      return acc;
    }, {});

    res.json(distinctValuesWithCounts);
  }),
);

router.get(
  '/bins',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('field').isIn(['age']),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // only works for age field
    const { bins, cohort_id } = req.query;
    const sql = visualization.ageHistogramSQL(cohort_id, bins);
    // console.log(sql.sql, sql.values);
    const _rows = await prisma.$queryRaw(sql);
    res.json(_rows);
  }),
);

router.get(
  '/date/bins',
  isPermittedTo('read'),
  validate([
    query('cohort_id').isUUID(),
    query('field').isIn(['max_enc_date', 'enroll_date', 'dob']),
    query('bins').default(10).isInt({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // only works for age field
    const { field, bins, cohort_id } = req.query;
    const _rows = await visualization.dateHistogram(cohort_id, field, bins);
    res.json(_rows);
  }),
);

router.get(
  '/:participant_id',
  isPermittedTo('read'),
  validate([
    param('participant_id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    // #swagger.summary = 'Get details of a participant by id.'

    const participant = await prisma.participant.findUniqueOrThrow({
      where: {
        id: req.params.participant_id,
      },
      include: {
        demographics: true,
        labs: true,
        covid_tests: true,
        covid_vaxes: true,
        dxs: true,
        hospitals: true,
        medications: true,
      },
    });
    // cache indefinitely - 1 year
    // use ui/src/services/cohort2.js cache_busting_id to invalidate cache if a need arises
    res.set('Cache-control', 'private, max-age=31536000');
    res.json(participant);
  }),
);

router.post(
  '/all',
  isPermittedTo('read'),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    const {
      currentPage, itemsPerPage, sortBy, sortingOrder,
    } = req.body;

    const data = await prisma.participant.findMany({
      take: itemsPerPage,
      skip: (currentPage - 1) * itemsPerPage,
      orderBy: {
        [sortBy]: sortingOrder,
      },
      include: {
        demographics: true,
      },
    });
    const count = await prisma.participant.count();

    return res.json({ data, count });
  }),
);

router.get(
  '/:id/details',
  isPermittedTo('read'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']

    const data = await prisma.participant.findUniqueOrThrow({
      where: {
        id: req.params.id,
      },
      include: {
        demographics: true,
      },
    });

    return res.json(data);
  }),
);

router.post(
  '/:id/:category/:view',
  isPermittedTo('read'),
  validate([
    param('id').isInt().toInt(),
  ]),
  asyncHandler(async (req, res, next) => {
    // #swagger.tags = ['participants']
    const { id, category, view } = req.params;
    const { dateRange } = req.body;

    let data = [];

    switch (category) {
      case 'Overview':
        data = await process_overview(id, view, dateRange);
        break;
      case 'Diagnosis':
        data = await process_diagnosis(id, view, dateRange);
        break;
      case 'Medications':
        data = await process_medication(id, view, dateRange);
        break;
      case 'Labs':
        data = await process_lab(id, view, dateRange);
        break;
      case 'Hospital Visits':
        data = await process_hospital(id, view, dateRange);
        break;
      case 'Covid Tests':
        data = await process_covid_test(id, view, dateRange);
        break;
      case 'Covid Vaccines':
        data = await process_covid_vaccine(id, view, dateRange);
        break;
      default:
        break;
    }

    return res.json(data);
  }),
);

const process_overview = async (id, view, dateRange) => {
  const data = {};

  if (view === 'timeline') {
    const participants = await prisma.participant.findMany({
      where: {
        id,
      },
      include: {
        dxs: true,
        medications: true,
        labs: true,
        hospitals: true,
        covid_tests: true,
        covid_vaxes: true,
      },

    });

    // eslint-disable-next-line no-restricted-syntax
    for (const participant of participants) {
      // eslint-disable-next-line no-restricted-syntax
      for (const key of Object.keys(participant)) {
        if (key === 'dxs') {
          data.diagnosis = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const dx of participant[key]) {
            const type = dx.name;
            const startDate = dx.date;

            data.diagnosis.push({
              label: type,
              startDate,
            });
          }
        } else if (key === 'medications') {
          data.medications = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const med of participant[key]) {
            const type = med.name;
            const startDate = med.start_date;

            data.medications.push({
              label: type,
              startDate,
            });
          }
        } else if (key === 'labs') {
          data.labs = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const lab of participant[key]) {
            const type = lab.name;
            const startDate = lab.date;

            data.labs.push({
              label: type,
              startDate,
            });
          }
        } else if (key === 'hospitals') {
          data.hospitals = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const hospital of participant[key]) {
            const type = hospital.dx_code;
            const startDate = hospital.admit_date;
            const endDate = hospital.discharge_date;

            data.hospitals.push({
              label: type,
              startDate,
              endDate,
            });
          }
        } else if (key === 'covid_tests') {
          data.covid_tests = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const test of participant[key]) {
            const type = test.result;
            const startDate = test.date;

            data.covid_tests.push({
              label: type,
              startDate,
            });
          }
        } else if (key === 'covid_vaxes') {
          data.covid_vaxes = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const vax of participant[key]) {
            const type = vax.name;
            const startDate = vax.date;

            data.covid_vaxes.push({
              label: type,
              startDate,
            });
          }
        }
      }
    }
  } else if (view === 'graph') {
    data.diagnosis = await process_diagnosis(id, view, dateRange);
    data.medications = await process_medication(id, view, dateRange);
    data.labs = await process_lab(id, view, dateRange);
    data.hospitals = await process_hospital(id, view, dateRange);
    data.covid_tests = await process_covid_test(id, view, dateRange);
    data.covid_vaxes = await process_covid_vaccine(id, view, dateRange);
  }
  return data;
};

const process_diagnosis = async (id, view, dateRange) => {
  const data = {};

  const whereClause = {
    participant_id: id,
  };

  if (view === 'graph') {
    whereClause.date = {

      gte: new Date(dateRange[0]),
      lte: new Date(dateRange[1]),

    };
  }

  const results = await prisma.dx.findMany({
    where: whereClause,

  });

  // sort and check for null values
  results.sort((a, b) => (a.date ? new Date(a.date) : -9999) - (b.date ? new Date(b.date) : -9999));
  results.sort((a, b) => new Date(a.date) - new Date(b.date));

  // eslint-disable-next-line no-restricted-syntax
  for (const result of results) {
    if (view === 'graph') {
      // console.log(result)
      const type = result.name;
      const { date } = result;

      // Get count of each diagnosis
      if (type in data) {
        data[type].value.push(1);
        data[type].date.push(date);
      } else {
        data[type] = {
          value: [1],
          unit: 'count',
          date: [date],
          type,
        };
      }
    } else if (view === 'timeline') {
      // console.log(result)
      const type = result.name;
      const startDate = result.date;

      if (type in data) {
        data[type].push({
          label: type,
          startDate,
        });
      } else {
        data[type] = [{
          label: type,
          startDate,
        }];
      }
    }
  }

  return data;
};

const process_medication = async (id, view, dateRange) => {
  const data = {};

  const whereClause = {
    participant_id: id,
  };

  if (view === 'graph') {
    whereClause.start_date = {

      gte: new Date(dateRange[0]),
      lte: new Date(dateRange[1]),

    };
  }

  const results = await prisma.medication.findMany({
    where: whereClause,

  });

  results.sort((a, b) => new Date(a.date) - new Date(b.date));

  // eslint-disable-next-line no-restricted-syntax
  for (const result of results) {
    if (view === 'graph') {
      // console.log(result)
      const type = result.name;
      const date = result.start_date;
      const value = result.strength_dose;
      const unit = result.strength_dose_unit;

      // Get count of each diagnosis
      if (type in data) {
        data[type].value.push(value);
        data[type].date.push(date);
      } else {
        data[type] = {
          value: [value],
          unit,
          date: [date],
          type,
        };
      }
    } else if (view === 'timeline') {
      // console.log(result)
      const type = result.name;
      const startDate = result.start_date;

      if (type in data) {
        data[type].push({
          label: type,
          startDate,
        });
      } else {
        data[type] = [{
          label: type,
          startDate,
        }];
      }
    }
  }

  return data;
};

const process_lab = async (id, view, dateRange) => {
  const data = {};

  const whereClause = {
    participant_id: id,
  };

  if (view === 'graph') {
    whereClause.date = {

      gte: new Date(dateRange[0]),
      lte: new Date(dateRange[1]),

    };
  }

  const results = await prisma.lab.findMany({
    where: whereClause,

  });

  results.sort((a, b) => new Date(a.date) - new Date(b.date));

  // eslint-disable-next-line no-restricted-syntax
  for (const result of results) {
    if (view === 'graph') {
      // console.log(result)
      const type = result.name;
      const { date } = result;
      const value = result.result;
      const { unit } = result;

      // Get count of each diagnosis
      if (type in data) {
        data[type].value.push(value);
        data[type].date.push(date);
      } else {
        data[type] = {
          value: [value],
          unit,
          date: [date],
          type,
        };
      }
    } else if (view === 'timeline') {
      // console.log(result)
      const type = result.name;
      const startDate = result.date;

      if (type in data) {
        data[type].push({
          label: type,
          startDate,
        });
      } else {
        data[type] = [{
          label: type,
          startDate,
        }];
      }
    }
  }

  return data;
};

const process_hospital = async (id, view, dateRange) => {
  const data = {};

  const whereClause = {
    participant_id: id,
  };

  if (view === 'graph') {
    whereClause.admit_date = {

      gte: new Date(dateRange[0]),
      lte: new Date(dateRange[1]),

    };
  }

  const results = await prisma.hospital.findMany({
    where: whereClause,

  });

  results.sort((a, b) => new Date(a.admit_date) - new Date(b.admit_date));

  // eslint-disable-next-line no-restricted-syntax
  for (const result of results) {
    if (view === 'graph') {
      // console.log(result)
      const type = result.dx_code;
      const date = result.admit_date;
      const value = 1;
      const unit = 'count';

      // Get count of each diagnosis
      if (type in data) {
        data[type].value.push(value);
        data[type].date.push(date);
      } else {
        data[type] = {
          value: [value],
          unit,
          date: [date],
          type,
        };
      }
    } else if (view === 'timeline') {
      // console.log(result)
      const type = result.dx_code;
      const startDate = result.admit_date;
      const endDate = result.discharge_date;

      if (type in data) {
        data[type].push({
          label: type,
          startDate,
          endDate,
        });
      } else {
        data[type] = [{
          label: type,
          startDate,
          endDate,
        }];
      }
    }
  }

  return data;
};

const process_covid_test = async (id, view, dateRange) => {
  const data = {};

  const whereClause = {
    participant_id: id,
  };

  if (view === 'graph') {
    whereClause.date = {

      gte: new Date(dateRange[0]),
      lte: new Date(dateRange[1]),

    };
  }

  const results = await prisma.covid_test.findMany({
    where: whereClause,

  });

  results.sort((a, b) => new Date(a.date) - new Date(b.date));

  // eslint-disable-next-line no-restricted-syntax
  for (const result of results) {
    if (view === 'graph') {
      // console.log(result)
      const type = result.result;
      const { date } = result;
      const value = 1;
      const unit = result.name;

      // Get count of each diagnosis
      if (type in data) {
        data[type].value.push(value);
        data[type].date.push(date);
      } else {
        data[type] = {
          value: [value],
          unit,
          date: [date],
          type,
        };
      }
    } else if (view === 'timeline') {
      // console.log(result)
      const type = result.result;
      const startDate = result.date;

      if (type in data) {
        data[type].push({
          label: type,
          startDate,
        });
      } else {
        data[type] = [{
          label: type,
          startDate,
        }];
      }
    }
  }

  return data;
};

const process_covid_vaccine = async (id, view, dateRange) => {
  const data = {};

  const whereClause = {
    participant_id: id,
  };

  if (view === 'graph') {
    whereClause.date = {

      gte: new Date(dateRange[0]),
      lte: new Date(dateRange[1]),

    };
  }

  const results = await prisma.covid_vax.findMany({
    where: whereClause,

  });

  results.sort((a, b) => new Date(a.date) - new Date(b.date));

  // eslint-disable-next-line no-restricted-syntax
  for (const result of results) {
    if (view === 'graph') {
      // console.log(result)
      const type = result.name;
      const { date } = result;
      const value = result.dose_number;
      const unit = result.manufacturer;

      // Get count of each diagnosis
      if (type in data) {
        data[type].value.push(value);
        data[type].date.push(date);
      } else {
        data[type] = {
          value: [value],
          unit,
          date: [date],
          type,
        };
      }
    } else if (view === 'timeline') {
      // console.log(result)
      const type = result.name;
      const startDate = result.date;

      if (type in data) {
        data[type].push({
          label: type,
          startDate,
        });
      } else {
        data[type] = [{
          label: type,
          startDate,
        }];
      }
    }
  }

  return data;
};

module.exports = router;
