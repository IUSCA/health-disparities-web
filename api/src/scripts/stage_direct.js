/* eslint-disable no-console */
const fsPromises = require('fs/promises');
const { PrismaClient } = require('@prisma/client');
const datasetService = require('../services/dataset');

const prisma = new PrismaClient();

async function trigger_wf(name, dataset_type) {
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
  console.log(`Created workflow ${wf.id} for dataset ${ds.id}`);
}

async function main() {
  const txt_file_path = '/opt/sca/app/list_of_broadID_to_release_for_Sean_McCabe.txt';
  const txt = await fsPromises.readFile(txt_file_path, 'utf8');
  const lines = txt.split('\n');
  // console.log(lines)

  // eslint-disable-next-line no-restricted-syntax
  for (const name of lines) {
    // eslint-disable-next-line no-await-in-loop
    await trigger_wf(name, 'DATA_PRODUCT');
  }
}

// async function test() {
//   return trigger_wf('SM-NACU2', 'DATA_PRODUCT');
// }

main().then((result) => {
  console.log(result);
  prisma.$disconnect();
}).catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
