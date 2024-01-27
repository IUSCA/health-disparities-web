/* eslint-disable no-console */
const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils');

const prisma = new PrismaClient();

async function importDemographicData(csvFilePath, enroll_snapshot_id) {
  // Set up a file to write any malformed rows to:
  const filename = await dateFilename('errors-demographics.csv');

  const errorStream = fs.createWriteStream(filename);

  // Read CSV file
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse the CSV data
  const { data } = Papa.parse(csvData, { header: true });

  // Loop through each row in the CSV data
  await asyncForEach(data, async (row, index) => {
    const {
      STUDY_ID,
      IB_ID,
      GENDER,
      RACE,
      ETHNICITY,
      DEID_MAX_ENC_DATE,
      CHS_FLAG,
      DEID_DOB,
      DEID_ENROLL_DATE,
    } = row;

    if (!STUDY_ID || !IB_ID) {
      errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.GENDER},${row.RACE},${row.ETHNICITY},${row.DEID_MAX_ENC_DATE},${row.CHS_FLAG},${row.DEID_DOB},${row.DEID_ENROLL_DATE}\n`);
    } else {
      const participant = await prisma.participant.upsert({
        where: { ib_id: IB_ID },
        update: {},
        create: {
          ib_id: IB_ID,
          study_id: Number(STUDY_ID),
          enroll_snapshot_id,
        },
      });

      // Check if the demographic record exists by study_id and ib_id
      // const existingDemographic = await prisma.demographic.findUnique({
      //   where: {
      //     study_id_ib_id: {
      //       study_id: Number(STUDY_ID),
      //       ib_id: IB_ID
      //     }
      //   }
      // });
      console.log('Participant:', participant);

      // Convert date strings to JavaScript Date objects
      const maxEncDate = await parseDate(DEID_MAX_ENC_DATE);
      const dob = await parseDate(DEID_DOB);
      const enrollDate = await parseDate(DEID_ENROLL_DATE);

      // console.log("Max_enc_date:", maxEncDate)
      // console.log("DOB:", dob)
      // console.log("Enroll date:", enrollDate)

      // If the demographic record does not exist, create a new demographic record
      try {
        await prisma.demographic.create({
          data: {
            gender: GENDER,
            race: RACE,
            ethnicity: ETHNICITY,
            max_enc_date: maxEncDate, // Use the converted date object
            chs_flag: parseInt(CHS_FLAG, 10),
            dob, // Use the converted date object
            enroll_date: enrollDate, // Use the converted date object
            participant_id: participant.id,
          },
        });
      } catch {
        errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.GENDER},${row.RACE},${row.ETHNICITY},${row.DEID_MAX_ENC_DATE},${row.CHS_FLAG},${row.DEID_DOB},${row.DEID_ENROLL_DATE}\n`);
      }
    }
  });

  // Close Prisma connection
  await prisma.$disconnect();
}

module.exports = { importDemographicData };
