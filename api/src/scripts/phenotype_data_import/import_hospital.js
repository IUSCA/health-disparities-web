/* eslint-disable no-console */
const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils');

const prisma = new PrismaClient();

async function importHospitalData() {
  // Delete all existing hospital records
  await prisma.hospital.deleteMany();

  // Set up a file to write any malformed rows to:
  const filename = await dateFilename('errors-hospital.csv');
  console.log('Filename set to', filename);
  const errorStream = fs.createWriteStream(filename);

  // Read CSV file
  const csvFilePath = 'data/rdrp4699_hosp.csv';
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // Parse the CSV data
  const { data } = Papa.parse(csvData, { header: true });

  // Loop through each row in the CSV data
  await asyncForEach(data, async (row, index) => {
    const {
      STUDY_ID, IB_ID_LONG, ENC_ID, DEID_ADMIT, DEID_DISCHARGE, DX_CODE, DX_CODE_SYSTEM,
    } = row;

    if (!STUDY_ID || !IB_ID_LONG) {
      console.log(`Missing study id ${STUDY_ID} or ib_id ${IB_ID_LONG}`);
      errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID_LONG},${row.DEID_ADMIT},${row.DEID_DISCHARGE},${row.DX_CODE},${row.DX_CODE_SYSTEM}\n`);
    } else {
      let participant = await prisma.participant.findFirst({ where: { ib_id: IB_ID_LONG } });

      // If the participant does not exist, create a new participant record
      if (!participant) {
        participant = await prisma.participant.create({
          data: {
            ib_id: IB_ID_LONG,
            study_id: Number(STUDY_ID),
          },
        });
      }

      // Convert date string to JavaScript Date object
      const admitDate = await parseDate(DEID_ADMIT);
      const dischargeDate = await parseDate(DEID_DISCHARGE);

      const data2 = {
        enc_id: ENC_ID,
        admit_date: admitDate,
        dx_code: DX_CODE,
        dx_code_system: DX_CODE_SYSTEM,
        participant_id: participant.id,
      };

      if (!Number.isNaN(dischargeDate)) data2.discharge_date = dischargeDate;

      console.log(data2);

      // It is faster to drop everything
      // and start fresh from the beginning
      // this check starts to take a long time as the table grows
      // const existingHospital = await prisma.hospital.findFirst({
      //   where: {
      //     study_id: Number(STUDY_ID),
      //     ib_id: IB_ID_LONG,
      //     enc_id: Number(ENC_ID),
      //     admit_date: admitDate,
      //     discharge_date: dischargeDate,
      //     dx_code: DX_CODE,
      //     dx_code_system: DX_CODE_SYSTEM

      //   }
      // });

      // If the hospital record does not exist, create a new hospital record
      try {
        await prisma.hospital.create({
          data,
        });
      } catch (err) {
        console.error(`Error creating hospital record: ${err}`);
        errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID_LONG},${row.DEID_ADMIT},${row.DEID_DISCHARGE},${row.DX_CODE},${row.DX_CODE_SYSTEM}\n`);
      }
    }
  });
  // Close the error stream
  errorStream.end();
  // Close Prisma connection
  await prisma.$disconnect();
  console.log('Hospital data import complete');
}

importHospitalData();
