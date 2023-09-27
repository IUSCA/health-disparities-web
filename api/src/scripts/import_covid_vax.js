const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils.js');

const prisma = new PrismaClient();

async function importCovidVaxData() {
  // Delete all existing covid_vax records
  await prisma.covid_vax.deleteMany()

  // Set up a file to write any malformed rows to:
  const filename = await dateFilename("errors-covid_vax.csv");
  console.log("Filename set to", filename)
  const errorStream = fs.createWriteStream(filename);

  // Read CSV file
  const csvFilePath = 'data/rdrp4699_covid_vax.csv';
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse the CSV data
  const { data } = Papa.parse(csvData, { header: true });

  // Loop through each row in the CSV data
  await asyncForEach(data, async (row, index) => {
    const { STUDY_ID, IB_ID, VACCINE_TEXT, MANUFACTURER_SHORT, DEID_IM_DATE, DOSE_NUMBER, SERIES_DOSES, IS_BOOSTER_YN } = row;

    if (!STUDY_ID || !IB_ID) {
      errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.VACCINE_TEXT},${row.MANUFACTURER_SHORT},${row.DEID_IM_DATE},${row.DOSE_NUMBER},${row.SERIES_DOSES},${row.IS_BOOSTER_YN}\n`);
    } else {

      let participant = await prisma.participant.findFirst({ where: { ib_id: IB_ID } });

      // If the participant does not exist, create a new participant record
      if (!participant) {
        participant = await prisma.participant.create({ data: { ib_id: IB_ID, study_id: Number(STUDY_ID) } });
      }

      // Convert date string to JavaScript Date object
      const covidVaxDate = await parseDate(DEID_IM_DATE);

      // It may be faster to drop everything 
      // and start fresh from the beginning 
      // this check starts to take a long time as the table grows
      // Check if the demographic record exists by study_id and ib_id
      // const existingCovid_vax = await prisma.covid_vax.findFirst({
      //   where: {
      //     study_id: Number(STUDY_ID),
      //     ib_id: IB_ID,
      //     name: VACCINE_TEXT,
      //     date: covidVaxDate, // Use the converted date object
      //     manufacturer: MANUFACTURER_SHORT,
      //     dose_number: DOSE_NUMBER,
      //     series_doses: SERIES_DOSES,
      //     is_booster: IS_BOOSTER_YN

      //   }
      // });

      // If the covid_vax record does not exist, create a new covid_vax record
      try {
        await prisma.covid_vax.create({
          data: {
            name: VACCINE_TEXT,
            date: covidVaxDate, // Use the converted date object
            manufacturer: MANUFACTURER_SHORT,
            dose_number: Number(DOSE_NUMBER),
            series_doses: Number(SERIES_DOSES),
            is_booster: IS_BOOSTER_YN,
            participant_id: participant.id

          }
        });
      } catch (err) {
        console.error(`Error creating covid_vax record: ${err}`);
        errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.VACCINE_TEXT},${row.MANUFACTURER_SHORT},${row.DEID_IM_DATE},${row.DOSE_NUMBER},${row.SERIES_DOSES},${row.IS_BOOSTER_YN}\n`);
      }
    }

  })
// Close the error stream
errorStream.end();
// Close Prisma connection
await prisma.$disconnect();
console.log('Covid_vax data import complete');

}

importCovidVaxData();
