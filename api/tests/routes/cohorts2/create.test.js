/* eslint-disable no-console */
const { CV } = require('../../../src/services/cohorts/authorization/constants');
const { request, getAuthRequest } = require('../../request');

let authRequest;
// const prefix = 'test';

beforeAll(async () => {
  authRequest = await getAuthRequest();
});

describe('create a cohort', () => {
  it('should respond with 401 unauthorized without token', async () => {
    const response = await request.post('/cohorts2').send();

    expect(response.status).toBe(401);
  });

  it('should create a phenotype cohort', async () => {
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

    // console.log(JSON.stringify(response.body, null, 2));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Cohort');
    expect(response.body.visibility).toBe(CV.PRIVATE);
    expect(response.body.is_temp).toBe(false);
    expect(response.body.is_derivable).toBe(true);
    expect(response.body.is_archived).toBe(false);
    expect(response.body).not.toHaveProperty('participants');
    expect(response.body.size).toBeGreaterThanOrEqual(0);
    expect(response.body.in_review).toBe(false);
    expect(response.body.is_referenced).toBe(false);

    // delete the cohort after test
    await authRequest.delete(`/cohorts2/${response.body.id}`);
  });
});
