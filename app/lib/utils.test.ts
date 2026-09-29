import { describe, expect, it } from "vitest";
import type { Revenue } from "./definitions";
import {
  formatCurrency,
  formatDateToLocal,
  generatePagination,
  generateYAxis,
} from "./utils";

describe("formatCurrency", () => {
  it("formats cents as US dollars", () => {
    expect(formatCurrency(123456)).toBe("$1,234.56");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-50)).toBe("-$0.50");
  });
});

describe("formatDateToLocal", () => {
  it("formats a date with the default locale", () => {
    expect(formatDateToLocal("2024-02-03")).toBe("Feb 3, 2024");
  });

  it("uses the requested locale", () => {
    expect(formatDateToLocal("2024-02-03", "en-GB")).toBe("3 Feb 2024");
  });
});

describe("generateYAxis", () => {
  it("rounds the maximum revenue up to the next thousand", () => {
    const revenue: Revenue[] = [
      { month: "Jan", revenue: 1200 },
      { month: "Feb", revenue: 3500 },
    ];

    expect(generateYAxis(revenue)).toEqual({
      topLabel: 4000,
      yAxisLabels: ["$4K", "$3K", "$2K", "$1K", "$0K"],
    });
  });

  it("uses zero as the top label when all revenue is zero", () => {
    expect(generateYAxis([{ month: "Jan", revenue: 0 }])).toEqual({
      topLabel: 0,
      yAxisLabels: ["$0K"],
    });
  });
});

describe("generatePagination", () => {
  it("lists every page when there are seven or fewer", () => {
    expect(generatePagination(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(generatePagination(1, 0)).toEqual([]);
  });

  it("shows the first three pages and final two near the start", () => {
    expect(generatePagination(3, 10)).toEqual([1, 2, 3, "...", 9, 10]);
  });

  it("shows the first two pages and final three near the end", () => {
    expect(generatePagination(8, 10)).toEqual([1, 2, "...", 8, 9, 10]);
  });

  it("shows neighboring pages in the middle", () => {
    expect(generatePagination(5, 10)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });
});
