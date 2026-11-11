import { describe, expect, it } from "vitest";
import { niceTicks } from "@/lib/chart";
import { formatDay, localYMD } from "@/lib/capsules";
import { formatChange, formatValue, indicatorDef, owidCsvToRows, parseCsv } from "@/lib/indicators";
import { formatPrice, planDef, planErrorMessage } from "@/lib/plans";
import { countdownText } from "@/components/LocalTime";

describe("niceTicks", () => {
  it.each([
    [71, 96],
    [4.4, 7.3],
    [0.5, 0.51],
    [-3, 12],
    [0, 1000],
  ])("encloses the data range [%d, %d]", (min, max) => {
    const t = niceTicks(min, max);
    expect(t[0]).toBeLessThanOrEqual(min);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(max);
    expect(t.length).toBeGreaterThanOrEqual(2);
    expect(t.length).toBeLessThanOrEqual(8);
  });

  it("handles a flat range without looping forever", () => {
    expect(niceTicks(5, 5).length).toBeGreaterThanOrEqual(1);
  });
});

describe("countdownText", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  it("says opened for past dates", () => {
    expect(countdownText("2026-11-10T00:00:00Z", now)).toBe("Opened");
  });
  it("shows hours on the last day", () => {
    expect(countdownText("2026-11-11T15:00:00Z", now)).toBe("Opens in 3 hours");
  });
  it("shows exactly one year", () => {
    expect(countdownText("2027-11-11T12:00:00Z", now)).toBe("Opens in 1 year");
  });
  it("shows years and days", () => {
    expect(countdownText("2029-11-21T12:00:00Z", now)).toMatch(/^Opens in 3 years \d+ days$/);
  });
});

describe("dates", () => {
  it("formats a calendar day without time-zone shifting", () => {
    expect(formatDay("2024-07-15")).toBe("Jul 15, 2024");
    expect(formatDay("2024-01-01")).toBe("Jan 1, 2024");
  });
  it("formats local Y-M-D with zero padding", () => {
    expect(localYMD(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("CSV parsing (Our World in Data)", () => {
  const csv =
    'entity,code,year,happy,happy__annotations\nAlbania,ALB,1998,61.2,\n"Congo, Dem. Rep.",COD,2010,"55.5","note, with comma"\n' +
    "World,OWID_WRL,2020,70,\nBad,XYZ,abc,1,\nEmpty,EMP,2001,,\r\nUSA,USA,2022,80.1,";

  it("handles quoted fields with commas", () => {
    expect(parseCsv(csv)[2]).toEqual(["Congo, Dem. Rep.", "COD", "2010", "55.5", "note, with comma"]);
  });

  it("keeps only valid country-year values", () => {
    expect(owidCsvToRows(csv)).toEqual([
      ["ALB", 1998, 61.2],
      ["COD", 2010, 55.5],
      ["USA", 2022, 80.1],
    ]);
  });
});

describe("indicator formatting", () => {
  const share = indicatorDef("happy_share");
  const score = indicatorDef("life_satisfaction");
  it("formats values", () => {
    expect(formatValue(share, 61.234)).toBe("61.2%");
    expect(formatValue(score, 5.4567)).toBe("5.46");
  });
  it("reports share changes in percentage points", () => {
    expect(formatChange(share, 44.7)).toBe("+44.7 pp");
    expect(formatChange(share, -3.25)).toBe("−3.3 pp");
    expect(formatChange(score, 1.234)).toBe("+1.23");
  });
});

describe("plans", () => {
  it("formats prices", () => {
    expect(formatPrice(400)).toBe("$4");
    expect(formatPrice(3999)).toBe("$39.99");
  });
  it("falls back to Free for unknown plans", () => {
    expect(planDef("nope").id).toBe("free");
  });
  it("translates database errors into friendly messages", () => {
    expect(planErrorMessage("ERROR: PLAN_VIDEO")).toMatch(/Premium/);
    expect(planErrorMessage("something else")).toBeNull();
  });
});
