/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
// eslint-disable-next-line import/no-extraneous-dependencies
const tqdm = require('tqdm');

async function dateFilename(suffix) {
  const today = new Date();

  // Extract year, month, and day from the date object
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Adding 1 to month since it's zero-indexed
  const day = String(today.getDate()).padStart(2, '0');

  // Create the filename using the extracted year, month, and day
  const filename = `${year}${month}${day}-${suffix}`; // Change the file extension as needed

  return filename;
}

async function asyncForEach(array, callback) {
  for (const [index, item] of tqdm(Object.entries(array))) {
    await callback(item, index, array);
  }
}

async function parseDate(dateStr) {
  // Extract the individual date components from the string
  // console.log(`Parsing date: ${dateStr}`  )
  const day = parseInt(dateStr.slice(0, 2), 10);
  const monthStr = dateStr.slice(2, 5);
  const year = parseInt(dateStr.slice(5, 9), 10);
  const hours = parseInt(dateStr.slice(10, 12), 10);
  const minutes = parseInt(dateStr.slice(13, 15), 10);
  const seconds = parseInt(dateStr.slice(16, 18), 10);

  // Define a mapping from month abbreviations to month numbers
  const monthMap = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  // Get the month number from the month abbreviation
  const month = monthMap[monthStr.toUpperCase()];

  // Create a new Date object with the parsed date components
  const date = new Date(year, month, day, hours, minutes, seconds);

  // console.log("Parsing date string:", dateStr)
  // console.log("Created date:", date)

  return date;
}

module.exports = {
  asyncForEach, parseDate, dateFilename,
};
