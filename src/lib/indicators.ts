export type IndicatorDef = {
  code: string;
  owidSlug: string;
  name: string;
  short: string;
  unit: string;
  description: string;
  source: string;
  sourceUrl: string;
  decimals: number;
  suffix: string;
};

export const INDICATORS: IndicatorDef[] = [
  {
    code: "life_satisfaction",
    owidSlug: "happiness-cantril-ladder",
    name: "Life satisfaction",
    short: "Life satisfaction",
    unit: "score 0–10",
    description:
      "Average answer to: imagine a ladder where 10 is the best possible life and 0 the worst — where do you stand today?",
    source: "World Happiness Report, via Our World in Data (CC BY 4.0)",
    sourceUrl: "https://ourworldindata.org/grapher/happiness-cantril-ladder",
    decimals: 2,
    suffix: "",
  },
  {
    code: "happy_share",
    owidSlug: "share-of-people-who-say-they-are-happy",
    name: "People who say they are happy",
    short: "Say they're happy",
    unit: "% of people",
    description: "Share of people who answer 'very happy' or 'rather happy'.",
    source: "World Values Survey, via Our World in Data (CC BY 4.0)",
    sourceUrl: "https://ourworldindata.org/grapher/share-of-people-who-say-they-are-happy",
    decimals: 1,
    suffix: "%",
  },
  {
    code: "trust_share",
    owidSlug: "self-reported-trust-attitudes",
    name: "People who say most people can be trusted",
    short: "Trust others",
    unit: "% of people",
    description: "Share of people who agree that 'most people can be trusted'.",
    source: "World Values Survey, via Our World in Data (CC BY 4.0)",
    sourceUrl: "https://ourworldindata.org/grapher/self-reported-trust-attitudes",
    decimals: 1,
    suffix: "%",
  },
];

export function indicatorDef(code: string) {
  return INDICATORS.find((i) => i.code === code);
}

export function formatValue(def: IndicatorDef | undefined, v: number) {
  if (!def) return v.toFixed(2);
  return `${v.toFixed(def.decimals)}${def.suffix}`;
}

/** Minimal RFC-4180 CSV parser (handles quoted fields and commas inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Converts an Our World in Data grapher CSV into [country, year, value] rows. */
export function owidCsvToRows(text: string): [string, number, number][] {
  const [header, ...data] = parseCsv(text);
  const codeIdx = header.indexOf("code");
  const yearIdx = header.indexOf("year");
  const valueIdx = 3; // first indicator column after entity, code, year
  const out: [string, number, number][] = [];
  for (const r of data) {
    const code = r[codeIdx];
    const year = Number(r[yearIdx]);
    const value = Number(r[valueIdx]);
    if (/^[A-Z]{3}$/.test(code ?? "") && Number.isFinite(year) && r[valueIdx] !== "" && Number.isFinite(value)) {
      out.push([code, year, value]);
    }
  }
  return out;
}

/** A difference between two values: percentage shares change in percentage points. */
export function formatChange(def: IndicatorDef | undefined, delta: number) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const abs = Math.abs(delta).toFixed(def?.decimals ?? 2);
  return `${sign}${abs}${def?.suffix === "%" ? " pp" : ""}`;
}
