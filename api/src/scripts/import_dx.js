const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const { asyncForEach, parseDate, dateFilename } = require('./utils.js');

const prisma = new PrismaClient();

async function importDxData() {
  // Delete all existing dx records
  await prisma.dx.deleteMany()
  // Set up a file to write any malformed rows to:
  const filename = await dateFilename("errors-dx.csv");
  console.log("Filename set to", filename)
  const errorStream = fs.createWriteStream(filename);

  // Read CSV file
  const csvFilePath = 'data/rdrp4699_dx.csv';
  // const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  const csvData = fs.createReadStream(csvFilePath, 'utf-8');

  const parser = Papa.parse(Papa.NODE_STREAM_INPUT);
  parser.on('data', async (row) => {


    // // Parse the CSV data
    // const { data } = Papa.parse(csvData, {
    //   header: true,
    //   step: async function (row) {

    // // Loop through each row in the CSV data
    // await asyncForEach(data, async (row, index) => {

    console.log("Current row", row)

    const [ STUDY_ID, IB_ID, DEID_DX_DATE, DX_CODE, DX_CODE_SYSTEM, DX_NAME ] = row;

    const index = -1;
    if (!Number(STUDY_ID) || !IB_ID) {
      console.log(`Missing study id ${STUDY_ID} or ib_id ${IB_ID}`)
      errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.DEID_DX_DATE},${row.DX_CODE},${row.DX_CODE_SYSTEM},${row.DX_NAME},\n`);
    } else {
      let participant = await prisma.participant.findFirst({ where: { ib_id: IB_ID } });

      // If the participant does not exist, create a new participant record
      if (!participant) {
        participant = await prisma.participant.create({ data: { ib_id: IB_ID, study_id: Number(STUDY_ID) } });
      }

      // Convert date string to JavaScript Date object
      const dxDate = await parseDate(DEID_DX_DATE);

      // It may be faster to drop everything 
      // and start fresh from the beginning 
      // this check starts to take a long time as the table grows
      // Check if the demographic record exists by study_id and ib_id
      // const existingDx = await prisma.dx.findFirst({
      //   where: {
      //     study_id: Number(STUDY_ID),
      //     ib_id: IB_ID,
      //     name: DX_NAME,
      //     date: dxDate, // Use the converted date object
      //     code: DX_CODE,
      //     code_system: DX_CODE_SYSTEM,
      //   }
      // });

      // If the dx record does not exist, create a new dx record
      try {
        await prisma.dx.create({
          data: {
            name: DX_NAME,
            date: dxDate, // Use the converted date object
            code: DX_CODE,
            code_system: DX_CODE_SYSTEM,
            participant_id: participant.id
          }
        });
      } catch (err) {
        console.error(`Error creating dx record: ${err}`);
        errorStream.write(`${index},${row.STUDY_ID},${row.IB_ID},${row.DEID_DX_DATE},${row.DX_CODE},${row.DX_CODE_SYSTEM},${row.DX_NAME},\n`);
      }

    }
  })
  // Handle end of stream
  parser.on('end', () => {
    // Parsing complete
    console.log('Dx data parsing csv complete');
  });

  // Handle any errors that occur during parsing
  parser.on('error', (error) => {
    // Handle parsing error
    console.log('Dx error encountered', error);
  });

  // Pipe the data from the readable stream to the parser
  csvData.pipe(parser);



  // Close the error stream
  // errorStream.end();
  // Close Prisma connection
  // await prisma.$disconnect();
  console.log('Dx data import complete');

}

importDxData();
