/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const path = require('path');
const { importCovidTestData } = require('./import_covid_test');
const { importCovidVaxData } = require('./import_covid_vax');
const { importDemographicData } = require('./import_demographics');
const { importLabData } = require('./import_labs');
const { importDxData } = require('./import_dx');
const { importHospitalData } = require('./import_hospital');
const { importMedicationData } = require('./import_medication');
// const { deleteClinical } = require('./delete_all_data');

const importAll = async (folder) => {
  // If delete flag is set, delete all data first
  // if (deleteFlag) await deleteClinical();

  const files = await fs.readdirSync(folder);
  for (const file of files) {
    console.log(`Importing ${file}...`);
    if (file.includes('covid_test')) {
      await importCovidTestData(path.join(folder, file));
    } else if (file.includes('covid_vax')) {
      await importCovidVaxData(path.join(folder, file));
    } else if (file.includes('demo')) {
      await importDemographicData(path.join(folder, file));
    } else if (file.includes('labs')) {
      await importLabData(path.join(folder, file));
    } else if (file.includes('dx')) {
      await importDxData(path.join(folder, file));
    } else if (file.includes('hosp')) {
      await importHospitalData(path.join(folder, file));
    } else if (file.includes('meds')) {
      await importMedicationData(path.join(folder, file));
    } else {
      console.log(`File: ${path.join(folder, file)}`);
      console.log('does not match any import function.');
    }
  }
};

function main() {
  if (process.argv.length !== 3) {
    console.log('Usage: node import_all.js <folder>');
    process.exit(1);
  }
  const folder = process.argv[2];
  importAll(folder);
}

if (require.main === module) {
  // This block will be executed only when the script is run directly,
  // not when it's required as a module.
  main();
}

module.exports = { importAll };
