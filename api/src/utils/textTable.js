const Table = require('cli-table3'); // CLI table formatting

/**
 * Converts an array of objects into a formatted table string.
 *
 * @param {Object[]} data - The data to be displayed in the table, where each object represents a row.
 * @param {string[]|null} [columns=null] - Optional array of column names to display. If not provided, columns are inferred from the first object in data.
 * @returns {string} The formatted table as a string.
 */
function toTable(data, columns = null) {
  const PADDING = 2;
  const MAX_COL_WIDTH = 80;
  const MIN_COL_WIDTH = 10;

  // infer columns from data if not provided
  let colNames = columns;
  if (!colNames) {
    colNames = Object.keys(data[0]);
  }

  const colWidths = colNames.map((col) => Math.min(
    MAX_COL_WIDTH,
    Math.max(
      MIN_COL_WIDTH,
      col.length, // Column header length
      ...data.map((row) => String(row[col]).length), // Max length of values
    ) + PADDING,
  ));

  const table = new Table({
    head: colNames,
    colWidths,
  });

  data.forEach((row) => {
    table.push(colNames.map((col) => row[col]));
  });

  return table.toString();
}

/**
 * Displays a flat object as a formatted table string.
 *
 * @param {Object} obj - The object to display (not nested).
 * @returns {string} The formatted table as a string.
 */
function flatObjectToTable(obj) {
  const table = new Table({
    head: ['Key', 'Value'],
    colWidths: [20, 60],
  });

  Object.entries(obj).forEach(([key, value]) => {
    table.push([key, String(value)]);
  });

  return table.toString();
}

function toPaginationInfo({ total, offset, limit }) {
  // Add pagination info below the table
  const paginationInfo = new Table({
    colWidths: [40],
    style: { 'padding-left': 2, head: [], border: [] },
  });

  const currPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  paginationInfo.push([
    `Page ${currPage} of ${totalPages} | Total Records: ${total}`,
  ]);

  return paginationInfo.toString();
}

module.exports = {
  toTable,
  flatObjectToTable,
  toPaginationInfo,
};
