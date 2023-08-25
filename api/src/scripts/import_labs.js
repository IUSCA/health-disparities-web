const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils.js');

const prisma = new PrismaClient();

async function importLabData() {
  // Set up a file to write any malformed rows to:
  const filename = await dateFilename("errors-labs.csv");
  console.log("Filename set to", filename)
  const errorStream = fs.createWriteStream(filename);

  // Read CSV file
  const csvFilePath = 'data/rdrp4661_labs.csv';
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse the CSV data
  const { data } = Papa.parse(csvData, { header: true });

  // Loop through each row in the CSV data
  await asyncForEach(data, async (row, index) => {
    const { STUDYID, IB_ID, DEID_LABDATE, CATEGORY, LAB_NAME, NUMERIC_RESULT, UNIT } = row;

    if (!STUDYID || !IB_ID) {
      errorStream.write(`${index},${row.STUDYID},${row.IB_ID},${row.DEID_LABDATE},${row.CATEGORY},${row.LAB_NAME},${row.NUMERIC_RESULT},${row.UNIT}\n`);
    } else {
      let participant = await prisma.participant.findFirst({ where: { ib_id: IB_ID, study_id: Number(STUDYID) } });

      // If the participant does not exist, create a new participant record
      if (!participant) {
        participant = await prisma.participant.create({ data: { ib_id: IB_ID, study_id: Number(STUDYID) } });
      }

      // Convert date string to JavaScript Date object
      const labDate = await parseDate(DEID_LABDATE);

      // // Check if the demographic record exists by study_id and ib_id
      // const existingLab = await prisma.lab.findFirst({
      //   where: {
      //     study_id: Number(STUDYID),
      //     ib_id: IB_ID,
      //     name: LAB_NAME,
      //     date: labDate, // Use the converted date object
      //     category: CATEGORY,
      //     result: Number(NUMERIC_RESULT),
      //     unit: UNIT
      //   }
      // });

      // If the lab record does not exist, create a new lab record
      // if (!existingLab) {
      try {
        await prisma.lab.create({
          data: {
            study_id: Number(STUDYID),
            ib_id: IB_ID,
            name: LAB_NAME,
            date: labDate, // Use the converted date object
            category: CATEGORY,
            result: Number(NUMERIC_RESULT),
            unit: UNIT,
            participant_id: participant.id
          }
        });
      } catch (err) {
        console.error(`Error creating lab record: ${err}`);
        errorStream.write(`${index},${row.STUDYID},${row.IB_ID},${row.DEID_LABDATE},${row.CATEGORY},${row.LAB_NAME},${row.NUMERIC_RESULT},${row.UNIT}\n`);
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
  console.log('Lab data import complete');

}

importLabData();
