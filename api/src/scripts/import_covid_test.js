const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils.js');

const prisma = new PrismaClient();

async function importCovidTestData() {
  // Delete all existing covid_test records
  await prisma.covid_test.deleteMany()

  // Set up a file to write any malformed rows to:
  const filename = await dateFilename("errors-covid_tests.csv");
  console.log("Filename set to", filename)
  const errorStream = fs.createWriteStream(filename);

  // Read CSV file
  const csvFilePath = 'data/rdrp4699_covid_test.csv';
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse the CSV data
  const { data } = Papa.parse(csvData, { header: true });

  // Loop through each row in the CSV data
  await asyncForEach(data, async (row, index) => {
    const { STUDY_ID, IB_ID, DEID_TEST_DATE, COVID_TEST, RESULTS } = row;

    if (!STUDY_ID || !IB_ID) {
      errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.DEID_TEST_DATE},${row.COVID_TEST},${row.RESULTS}\n`);
    } else {
      let participant = await prisma.participant.findFirst({ where: { ib_id: IB_ID } });

      // If the participant does not exist, create a new participant record
      if (!participant) {
        participant = await prisma.participant.create({ data: { ib_id: IB_ID, study_id: Number(STUDY_ID) } });
      }

      // Convert date string to JavaScript Date object
      const covidTestDate = await parseDate(DEID_TEST_DATE);

      // // Check if the record exists by study_id and ib_id
      // const existingCovid_test = await prisma.covid_test.findFirst({
      //   where: {
      //     study_id: Number(STUDY_ID),
      //     ib_id: IB_ID,
      //     name: COVID_TEST,
      //     date: covidTestDate, // Use the converted date object
      //     result: RESULTS,
      //   }
      // });

      // If the covid_test record does not exist, create a new covid_test record
      // if (!existingCovid_test) {
      try {
        await prisma.covid_test.create({
          data: {
            name: COVID_TEST,
            date: covidTestDate, // Use the converted date object
            result: RESULTS,
            participant_id: participant.id
          }
        });
      } catch (err) {
        console.error(`Error creating covid_test record: ${err}`);
        errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.DEID_TEST_DATE},${row.COVID_TEST},${row.RESULTS}\n`);
      }
      // }
      // else {
      //   console.log("skipping existing record for row", index)
      // }
    }

  })
  // Close the error stream
  errorStream.end();
  // Close Prisma connection
  await prisma.$disconnect();
  console.log('Covid_test data import complete');

}

importCovidTestData();
