const axios = require('axios');
const config = require('config');

const client = axios.create({
  baseURL: config.get('openai.base_url'),
  headers: { 'X-API-Key': config.get('openai.api_key') },
});
const model = 'Llama-3-8B-Instruct-GPTQ-4-Bit';

const db_schema = `model participant {
  id           Int           @id @default(autoincrement())
  ib_id        String
  study_id     Int
  demographics demographic[]
  labs         lab[]
  covid_tests  covid_test[]
  covid_vaxes  covid_vax[]
  dxs          dx[]
  hospitals    hospital[]
  medications  medication[]
  @@unique([ib_id, study_id])
}

model demographic {
  id           Int       @id @default(autoincrement())
  gender       String
  race         String
  ethnicity    String?
  max_enc_date DateTime
  chs_flag     Int
  age          Float
  enroll_date  DateTime?
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])
}

model lab {
  id       Int      @id @default(autoincrement())
  name     String
  date     DateTime
  category String   @db.VarChar(100)
  result   Decimal
  unit     String   @db.VarChar(100)
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])
}

model covid_test {
  id   Int      @id @default(autoincrement())
  name String
  date DateTime
  result String
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])
}

model covid_vax {
  id           Int      @id @default(autoincrement())
  name         String   @db.VarChar(100)
  date         DateTime
  manufacturer String
  dose_number  Int
  series_doses Int
  is_booster   String
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])
}

// AKA diagnosis
model dx {
  id   Int    @id @default(autoincrement())
  name String  // name of the diagnosis
  date        DateTime
  code        String // ICD-9 or ICD-10 code
  code_system String
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])

model hospital {
  id             Int       @id @default(autoincrement())
  enc_id         String
  admit_date     DateTime
  discharge_date DateTime?
  dx_code        String
  dx_code_system String
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])
}
model medication {
  id                 Int      @id @default(autoincrement())
  name               String
  category           String
  start_date         DateTime
  dispense_qty       Decimal?
  dispense_qty_unit  String?
  nbr_refills        Int?
  strength_dose      String?
  strength_dose_unit String?
  participant_id Int
  participant    participant @relation(fields: [participant_id], references: [id])
}
`;

const json_schema = {
  type: 'object',
  properties: {
    filters: {
      anyOf: [
        { $ref: '#/definitions/query' },
      ],
    },
  },
  required: ['filters'],
  additionalProperties: false,
  definitions: {
    query: {
      type: 'object',
      properties: {
        operator: { enum: ['AND', 'OR', 'NOT_AND', 'NOT_OR'] },
        children: {
          type: 'array',
          items: { anyOf: [{ $ref: '#/definitions/query' }, { $ref: '#/definitions/leafNode' }] },
        },
      },
      required: ['operator', 'children'],
      additionalProperties: false,
    },
    leafNode: {
      type: 'object',
      properties: {
        field: { type: 'string', format: 'customFieldFormat' },
        operator: {
          enum: [
            'in', 'not_in',
            'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
            'contains', 'not_contains', 'starts_with', 'ends_with',
            'is_null', 'is_not_null',
          ],
        },
        value: {
          anyOf: [{
            type: 'array',
            items: {
              anyOf: [{ type: 'string' }, { type: 'number' }],
            },
          }, { type: 'string' }, { type: 'number' }, { type: 'null' }],
        },
      },
      required: ['field', 'operator', 'value'],
      additionalProperties: false,
    },
  },
};

const example_text = 'female participants with diabetes who are 50 years of age or older';
const example_json_query = {
  operator: 'AND',
  children: [
    { field: 'demographic.gender', operator: 'in', value: ['F'] },
    { field: 'demographic.age', operator: 'gte', value: '50' },
    { field: 'dx.name', operator: 'in', value: ['diabetes'] },
  ],
};
const example_metadata = {
  title: 'Female Diabetics 50+',
  description: 'female participants with diabetes who are 50 years of age or older ',
};

async function generate_cohort(text) {
  const res = await client.post('/completions', {
    model,
    messages: [
      {
        role: 'system',
        content: `You convert text questions to a simplified JSON representation of SQL queries against a PostgresSQL database with the following data model:  ${db_schema}.  The JSON you output should conform to the following schema:  ${JSON.stringify(json_schema)}. Example text query: ${example_text}, output json query: ${JSON.stringify(example_json_query)}. Return only the json, do not include any other description`,
      },
      {
        role: 'user',
        content: `Convert this text to the JSON for a SQL query: ${text}.`,
      },
    ],
  });
  // console.log(JSON.stringify(res.data, null, 2));
  const json = res.data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(json);
}

async function generate_cohort_name_description(query) {
  const res = await client.post('/completions', {
    model,
    messages: [
      {
        role: 'system',
        content: `You generate title and description of cohorts given as json queries.
        Name should be maximum of 3 words. keep description simple. use medical / scientific terms as the intended audience are researchers.
        Example json query: ${JSON.stringify(example_json_query)}, output: ${JSON.stringify(example_metadata)}. 
        Return only the json, do not include any other description`,
      },
      {
        role: 'user',
        content: `Cohort: ${JSON.stringify(query)}.`,
      },
    ],
  });
  const json = res.data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(json);
}

module.exports = {
  generate_cohort,
  generate_cohort_name_description,
};
