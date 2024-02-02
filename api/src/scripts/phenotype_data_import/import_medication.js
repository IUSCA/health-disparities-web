/* eslint-disable no-console */
const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils');

const prisma = new PrismaClient();

async function importMedicationData(csvFilePath, enroll_snapshot_id) {
  // Delete all existing medication records
  await prisma.medication.deleteMany();

  // Set up a file to write any malformed rows to:
  const filename = await dateFilename('errors-medication.csv');
  console.log('Filename set to', filename);
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
      DRUG_CATEGORY,
      DRUG_NAME,
      DEID_START_DATE,
      DISPENSEQTY,
      DISPENSEQTYUNIT,
      NBRREFILLS,
      STRENGTHDOSE,
      STRENGTHDOSEUNIT,
    } = row;

    if (!STUDY_ID || !IB_ID) {
      errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.DRUG_CATEGORY},${row.DRUG_NAME},${row.DEID_START_DATE},${row.DISPENSEQTY},${row.DISPENSEQTYUNIT},${row.NBRREFILLS},${row.STRENGTHDOSE},${row.STRENGTHDOSEUNIT}\n`);
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

      // Convert date string to JavaScript Date object
      const medicationDate = await parseDate(DEID_START_DATE);

      // It may be faster to drop everything
      // and start fresh from the beginning
      // this check starts to take a long time as the table grows
      // Check if the demographic record exists by study_id and ib_id
      // const existingMedication = await prisma.medication.findFirst({
      //   where: {
      //     study_id: Number(STUDY_ID),
      //     ib_id: IB_ID,
      //     name: DRUG_NAME,
      //     category: DRUG_CATEGORY,
      //     start_date: medicationDate, // Use the converted date object
      //     dispense_qty: Number(DISPENSEQTY),
      //     dispense_qty_unit: DISPENSEQTYUNIT,
      //     nbr_refills: Number(NBRREFILLS),
      //     strength_dose: Number(STRENGTHDOSE),
      //     strength_dose_unit: STRENGTHDOSEUNIT
      //   }
      // });

      // If the medication record does not exist, create a new medication record
      try {
        await prisma.medication.create({
          data: {
            name: DRUG_NAME,
            category: DRUG_CATEGORY,
            start_date: medicationDate, // Use the converted date object
            dispense_qty: Number(DISPENSEQTY),
            dispense_qty_unit: DISPENSEQTYUNIT,
            nbr_refills: Number(NBRREFILLS),
            strength_dose: STRENGTHDOSE,
            strength_dose_unit: STRENGTHDOSEUNIT,
            participant_id: participant.id,
          },
        });
      } catch (err) {
        console.error(`Error creating medication record: ${err}`);
        errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.DRUG_CATEGORY},${row.DRUG_NAME},${row.DEID_START_DATE},${row.DISPENSEQTY},${row.DISPENSEQTYUNIT},${row.NBRREFILLS},${row.STRENGTHDOSE},${row.STRENGTHDOSEUNIT}\n`);
      }
    }
  });
  // Close the error stream
  errorStream.end();
  // Close Prisma connection
  await prisma.$disconnect();
  console.log('Medication data import complete');
}

module.exports = { importMedicationData };
