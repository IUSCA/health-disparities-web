import { describe, expect, test } from "vitest";

import { parseBEDFile, parseBEDLine, parseQuery } from "./lib";

describe("parseBEDLine", () => {
  test("should return null for a line with less than 3 fields", () => {
    const line = "chr1\t100";
    const result = parseBEDLine(line);
    expect(result).toBe(null);
  });

  test("should return null for a line with an invalid chromosome", () => {
    const line = "chr\t100\t200";
    const result = parseBEDLine(line);
    expect(result).toBe(null);
  });

  test("should return a BED object for a valid line", () => {
    const line = "CHR1\t100\t200";
    const result = parseBEDLine(line);
    expect(result).toBe(result, {
      chr: "1",
      start: 101,
      end: 200,
    });
  });
});

describe("parseQuery", () => {
  test("should return null for an empty string", () => {
    const result = parseQuery("");
    expect(result).toBe(null);
  });

  test("should return null for a string that does not match any pattern", () => {
    const result = parseQuery("chr:100-200");
    expect(result).toBe(null);
  });

  test("should return a region object for a valid region string", () => {
    const result = parseQuery("chr1:100-200");
    expect(result).toStrictEqual({
      text: "CHR1:100-200",
      type: "region",
      value: {
        chr: "1",
        start: 100,
        end: 200,
      },
    });
  });

  test("should return a region object for a valid region string with commas", () => {
    const result = parseQuery("chr1:100,000-200,000");
    expect(result).toStrictEqual({
      text: "CHR1:100000-200000",
      type: "region",
      value: {
        chr: "1",
        start: 100000,
        end: 200000,
      },
    });
  });

  // cSpell: ignore BRCA
  test("should return a gene object for a valid gene string", () => {
    const result = parseQuery("BRCA1");
    expect(result).toStrictEqual({
      text: "BRCA1",
      type: "gene",
      value: {
        name: "BRCA1",
      },
    });
  });

  test("should return a gene object for a valid gene name with hyphen or dot", () => {
    const result = parseQuery("NKX2-5");
    expect(result).toStrictEqual({
      text: "NKX2-5",
      type: "gene",
      value: {
        name: "NKX2-5",
      },
    });
  });

  test("should return a gene object for a valid gene name with hyphen or dot", () => {
    const result = parseQuery("AC000093.1");
    expect(result).toStrictEqual({
      text: "AC000093.1",
      type: "gene",
      value: {
        name: "AC000093.1",
      },
    });
  });

  test("should return a variant object for a valid variant string", () => {
    const result = parseQuery("1-100-A-T");
    expect(result).toStrictEqual({
      text: "1-100-A-T",
      type: "variant",
      value: {
        chr: "1",
        position: 100,
        ref: "A",
        alt: "T",
      },
    });
  });

  test("should return a variant object for a valid variant string with commas", () => {
    const result = parseQuery("1-1,00,000-A-T");
    expect(result).toStrictEqual({
      text: "1-100000-A-T",
      type: "variant",
      value: {
        chr: "1",
        position: 100000,
        ref: "A",
        alt: "T",
      },
    });
  });
});

describe("parseBEDFile", () => {
  test("should return an empty array for an empty file", async () => {
    const file = "";
    const fileObj = new File([file], "test.bed");
    const result = await parseBEDFile(fileObj);
    expect(result).toStrictEqual([]);
  });

  test("should return an array of BED objects for a valid file", async () => {
    const file = "CHR1\t100\t200\nCHR2\t300\t400";
    const fileObj = new File([file], "test.bed");
    const result = await parseBEDFile(fileObj);
    expect(result).toStrictEqual([
      {
        text: "CHR1:101-200",
        type: "region",
        value: {
          chr: "1",
          start: 101,
          end: 200,
        },
      },
      {
        text: "CHR2:301-400",
        type: "region",
        value: {
          chr: "2",
          start: 301,
          end: 400,
        },
      },
    ]);
  });

  test("should ignore lines with invalid chromosome", async () => {
    const file = "CHR1\t100\t200\n2\t300\t400";
    const fileObj = new File([file], "test.bed");
    const result = await parseBEDFile(fileObj);
    expect(result).toStrictEqual([
      {
        text: "CHR1:101-200",
        type: "region",
        value: {
          chr: "1",
          start: 101,
          end: 200,
        },
      },
    ]);
  });

  test("should ignore lines with invalid start or end positions", async () => {
    const file = "CHR1\t100\t200\nCHR2\t300\t";
    const fileObj = new File([file], "test.bed");
    const result = await parseBEDFile(fileObj);
    expect(result).toStrictEqual([
      {
        text: "CHR1:101-200",
        type: "region",
        value: {
          chr: "1",
          start: 101,
          end: 200,
        },
      },
    ]);
  });

  test("should ignore empty lines and comments", async () => {
    const file = "CHR1\t100\t200\n\n# Comment\nCHR2\t300\t400";
    const fileObj = new File([file], "test.bed");
    const result = await parseBEDFile(fileObj);
    expect(result).toStrictEqual([
      {
        text: "CHR1:101-200",
        type: "region",
        value: {
          chr: "1",
          start: 101,
          end: 200,
        },
      },
      {
        text: "CHR2:301-400",
        type: "region",
        value: {
          chr: "2",
          start: 301,
          end: 400,
        },
      },
    ]);
  });
});
