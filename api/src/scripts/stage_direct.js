/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
const fsPromises = require('fs/promises');
// const { setTimeout } = require('timers/promises');

const { PrismaClient } = require('@prisma/client');
const _ = require('lodash/fp');

const datasetService = require('../services/dataset');

const prisma = new PrismaClient();
const BATCH_SIZE = 10;

async function trigger_wf(name, dataset_type) {
  try {
    const ds = await prisma.dataset.findFirst({
      where: {
        name,
        type: dataset_type,
        is_staged: false,
      },
    });

    if (!ds) {
      console.log(`skipped staging ${name}`);
      return;
    }

    const dataset = await datasetService.get_dataset({
      id: ds.id,
      workflows: true,
    });

    const wf = await datasetService.create_workflow(dataset, 'stage_direct');
    console.log(`Created workflow ${wf.workflow_id} for dataset ${ds.name} (${ds.id})`);
  } catch (e) {
    if (e.name === 'AssertionError') {
      console.error(`Assertion error processing ${name}: ${e.message}`);
    } else {
      console.error(`Error processing ${name}:`, e);
    }
  }
}

async function main() {
  const txt_file_path = process.argv[2];
  if (!txt_file_path) {
    console.error('Error: Please provide the path to the text file as a command line argument.');
    process.exit(1);
  }
  const txt = await fsPromises.readFile(txt_file_path, 'utf8');
  const lines = txt.split('\n').filter((line) => line.trim() !== '');
  // console.log(lines)

  let num_processed = 0;
  const batches = _.chunk(BATCH_SIZE)(lines);
  for (const batch of batches) {
    await Promise.all(batch.map((name) => trigger_wf(name, 'DATA_PRODUCT')));
    // await setTimeout(1000);
    num_processed += batch.length;
    console.log(`Processed: ${num_processed}`);
  }
}

// async function test() {
//   return trigger_wf('SM-NACU2', 'DATA_PRODUCT');
// }

main().then(() => {
  // console.log(result);
  prisma.$disconnect();
}).catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
