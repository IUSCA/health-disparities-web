/* eslint-disable no-console */
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

describe('search cohorts', () => {
  it('should respond with 401 unauthorized without token', async () => {
    const response = await request.get('/cohorts2/search').send();
    expect(response.status).toBe(401);
  });

  it('should search cohorts', async () => {
    await withCohort(async (cohort) => {
      const response = await authRequest.get('/cohorts2')
        .query({
          name: cohort.name,
          archived: cohort.is_archived,
          derivable: cohort.is_derivable,
          visibility: cohort.visibility,
          description: cohort.description,
          created_by_me: true,
          sort_by: 'size',
          sort_order: 'desc',
        });

      // console.log(JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe(cohort.name);
    });
  });

  it('should return empty results for non-existing cohort', async () => {
    const response = await authRequest.get('/cohorts2')
      .query({
        name: 'Non-existing Cohort',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.length).toBe(0);
  });
});
