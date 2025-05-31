/* eslint-disable no-console */
const { CV } = require('../../../src/services/cohorts/authorization/constants');
const { request, getAuthRequest } = require('../../request');

let authRequest;
// const prefix = 'test';

beforeAll(async () => {
  authRequest = await getAuthRequest();
});

async function createPhenotypeCohort() {
  const response = await authRequest.post('/cohorts2')
    .send({
      name: 'Test Cohort',
      query: {
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
                field: 'demographic_extended.age',
                operator: 'gt',
                value: '10',
              },
              {
                field: 'demographic_extended.age',
                operator: 'lt',
                value: '30',
              },
            ],
          },
          snapshot_id: 1,
        },
      },
      description: 'A test cohort',
    });
  return response.body;
}

async function withCohort(testFn) {
  const cohort = await createPhenotypeCohort();
  try {
    await testFn(cohort);
  } finally {
    await authRequest.delete(`/cohorts2/${cohort.id}`);
  }
}

describe('update a cohort', () => {
  it('should respond with 401 unauthorized without token', async () => {
    const response = await request.put('/cohorts2/1').send();
    expect(response.status).toBe(401);
  });

  it('should update name and description of a cohort', async () => {
    await withCohort(async (cohort) => {
      const response = await authRequest.patch(`/cohorts2/${cohort.id}`)
        .send({
          name: 'Updated Cohort',
          description: 'An updated test cohort',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Cohort');
      expect(response.body.description).toBe('An updated test cohort');
      expect(response.body.id).toBe(cohort.id);
      expect(response.body.visibility).toBe(cohort.visibility);
      expect(response.body.is_derivable).toBe(cohort.is_derivable);
      expect(response.body.is_archived).toBe(cohort.is_archived);
      expect(response.body.size).toBe(cohort.size);
      expect(response.body.in_review).toBe(cohort.in_review);
      expect(response.body.is_referenced).toBe(cohort.is_referenced);
      expect(response.body).not.toHaveProperty('participants');
    });
  });

  it('should update visibility of a cohort to unlisted', async () => {
    await withCohort(async (cohort) => {
      const response = await authRequest.patch(`/cohorts2/${cohort.id}/visibility`)
        .send({
          visibility: CV.UNLISTED,
        });

      expect(response.status).toBe(200);

      // Confirm only 'visibility' changed among the checked fields
      expect(response.body.visibility).toBe(CV.UNLISTED);
      expect(response.body.id).toBe(cohort.id);
      expect(response.body.name).toBe(cohort.name);
      expect(response.body.is_derivable).toBe(cohort.is_derivable);
      expect(response.body.is_archived).toBe(cohort.is_archived);
      expect(response.body.size).toBe(cohort.size);
      expect(response.body.in_review).toBe(cohort.in_review);
      expect(response.body.is_referenced).toBe(cohort.is_referenced);
      expect(response.body).not.toHaveProperty('participants');
    });
  });

  it('should not update visibility of a cohort to public from private without first changing to unlisted', async () => {
    await withCohort(async (cohort) => {
      const response = await authRequest.patch(`/cohorts2/${cohort.id}/visibility`)
        .send({
          visibility: CV.PUBLIC,
        });

      expect(response.status).toBe(403);
    });
  });

  it('should send 404 for non-existent cohort', async () => {
    const response = await authRequest.patch('/cohorts2/263889f4-0ed4-49b6-abdd-23bc93148fe3')
      .send({
        name: 'Updated Cohort',
        description: 'An updated test cohort',
      });

    expect(response.status).toBe(404);
  });

  // test for archiving a cohort POST /cohorts2/:id/actions/archive
  it('should archive a cohort', async () => {
    await withCohort(async (cohort) => {
      const response = await authRequest.post(`/cohorts2/${cohort.id}/actions/archive`).send();

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(cohort.id);
      expect(response.body.is_archived).toBe(true);
      expect(response.body.is_locked).toBe(true);
      expect(response.body.is_derivable).toBe(false);
    });
  });

  // test for un-archiving a cohort POST /cohorts2/:id/actions/unarchive
  it('should unarchive a cohort', async () => {
    await withCohort(async (cohort) => {
      // First archive the cohort
      await authRequest.post(`/cohorts2/${cohort.id}/actions/archive`).send();

      // Now unarchive it
      const response = await authRequest.post(`/cohorts2/${cohort.id}/actions/unarchive`).send();

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(cohort.id);
      expect(response.body.is_archived).toBe(false);
      expect(response.body.is_locked).toBe(cohort.visibility === CV.PRIVATE ? false : cohort.is_locked);
      expect(response.body.is_derivable).toBe(true);
    });
  });
});
