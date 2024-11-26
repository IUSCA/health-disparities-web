import { readTextFile } from "@/services/utils";

function parseQuery(text, { includeCommas = false } = {}) {
  /*
  Text can be in the following formats:

  Gene: BRCA2
  Variant: 13-32355250-T-C
  Genomic region: chr13:32355000-32375000

  If text starts with a number, assume it is a variant
  If text starts with 'chr', assume it is a genomic region
  Otherwise, assume it is a gene
  */

  // match variants in the format 13-32355000-T-C
  // allow commas in the number for easier reading, e.g. 13-32,355,000-T-C
  const variantRegex = /^([\dXY]+)-(\d+(?:,\d+)*)-([ATCG]+)-([ATCG]+)$/;

  // match genomic regions in the format CHR13:32355000-32375000
  // allow commas in the number for easier reading, e.g. CHR13:32,355,000-32,375,000
  const genomicRegionRegex = /^CHR([\dXY]+):(\d+(?:,\d+)*)-(\d+(?:,\d+)*)$/;

  // match gene names with letters, numbers, hyphens, and periods.
  // at least one letter must be present
  // e.g. BRCA1, BRCA2, NKX2-5, AC000093.1
  // it does not match 1-1 or 12345
  // (?=.*[a-zA-Z]): This is a positive lookahead that ensures at least one alphabetic character (either lowercase or uppercase) is present anywhere in the string.
  // [\w.-]+: Matches one or more word characters (\w): a-zA-Z0-9_, periods (.), or hyphens (-). This part allows for the gene names to contain digits, hyphens, periods, and letters, as long as the lookahead ensures that at least one letter is present.
  const geneRegex = /^(?=.*[a-zA-Z])[\w.-]+$/;

  text = text.trim().toUpperCase();
  if (variantRegex.test(text)) {
    const match = text.match(variantRegex);
    const chr = match[1];
    const position = parseInt(match[2].replace(/,/g, ""));
    const ref = match[3];
    const alt = match[4];
    const position_str = includeCommas ? position.toLocaleString() : position;
    return {
      text: `${chr}-${position_str}-${ref}-${alt}`,
      type: "variant",
      value: {
        chr,
        position,
        ref,
        alt,
      },
    };
  } else if (genomicRegionRegex.test(text)) {
    const match = text.match(genomicRegionRegex);
    const chr = match[1];
    const start = parseInt(match[2].replace(/,/g, ""));
    const end = parseInt(match[3].replace(/,/g, ""));
    const start_str = includeCommas ? start.toLocaleString() : start;
    const end_str = includeCommas ? end.toLocaleString() : end;
    return {
      text: `CHR${chr}:${start_str}-${end_str}`,
      type: "region",
      value: {
        chr,
        start,
        end,
      },
    };
  } else if (geneRegex.test(text)) {
    return {
      text,
      type: "gene",
      value: {
        name: text,
      },
    };
  } else {
    return null;
  }
}

const chrRegex = /^CHR([\dXY]+)$/;
function parseBEDLine(line) {
  const fields = line.split("\t"); // Split by tab
  // console.log("Split fields", fields);
  if (fields.length >= 3) {
    const chrStr = fields[0];
    if (chrRegex.test(chrStr)) {
      const chr = chrStr.match(chrRegex)[1];
      const start = parseInt(fields[1].replace(/,/g, ""), 10) + 1; // Convert start to one-based indexing
      const end = parseInt(fields[2].replace(/,/g, ""), 10);
      return {
        chr,
        start,
        end,
      };
    }
  }
  return null;
}

function parseBEDFile(file) {
  return readTextFile(file).then((contents) => {
    return contents
      .split("\n")
      .map((line) => line.trim().toUpperCase()) // Trim and convert to uppercase
      .filter((line) => line && !line.startsWith("#")) // Remove empty lines and comments
      .map((line) => parseBEDLine(line))
      .filter((result) => result != null)
      .map(({ chr, start, end }) => {
        // return result in the same format as parseQuery
        return {
          text: `CHR${chr}:${start}-${end}`,
          type: "region",
          value: {
            chr,
            start,
            end,
          },
        };
      });
  });
}

// Function to parse the BED file
// returns a promise that resolves to an array of regions
// each region is an object compatible with the query object / return value of parseQuery
// function parseBEDFile(file, { includeCommas = false } = {}) {
//   const chrRegex = /^CHR([\dXY]+)$/;

//   // console.log("Parsing BED file", file);
//   const reader = new FileReader();

//   // On successful file read
//   const parse = (e) => {
//     const contents = e.target.result; // Get file contents
//     // console.log("Parsing BED file contents", contents);
//     const lines = contents.split("\n"); // Split the contents by line
//     // console.log("Split lines", lines);

//     return lines
//       .map((line) => line.trim().toUpperCase()) // Trim and convert to uppercase
//       .filter((line) => line && !line.startsWith("#")) // Remove empty lines and comments
//       .map((line) => {
//         const fields = line.split("\t"); // Split by tab
//         // console.log("Split fields", fields);
//         if (fields.length >= 3) {
//           const chrStr = fields[0];
//           if (chrRegex.test(chrStr)) {
//             const chr = chrStr.match(chrRegex)[1];
//             const start = parseInt(fields[1].replace(/,/g, ""), 10) + 1; // Convert start to one-based indexing
//             const end = parseInt(fields[2].replace(/,/g, ""), 10);
//             const start_str = includeCommas ? start.toLocaleString() : start;
//             const end_str = includeCommas ? end.toLocaleString() : end;
//             return {
//               text: `CHR${chr}:${start_str}-${end_str}`,
//               type: "region",
//               value: {
//                 chr,
//                 start,
//                 end,
//               },
//             };
//           }
//         }
//       })
//       .filter((region) => region != null);
//   };

//   // Read the file as text
//   reader.readAsText(file);

//   return new Promise((resolve, reject) => {
//     reader.onload = (event) => {
//       // console.log("File read successfully");
//       const regions = parse(event);
//       // console.log("Parsed regions", regions);
//       resolve(regions);
//     };
//     reader.onerror = (e) => {
//       reject(e.target.error);
//     };
//   });
// }

export { parseBEDFile, parseBEDLine, parseQuery };
