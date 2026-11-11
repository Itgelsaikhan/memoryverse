import { describe, expect, it } from "vitest";
import { fromAcceptLanguage, isLocale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en";
import mn from "@/i18n/dictionaries/mn";
import { countdownText } from "@/components/LocalTime";
import { countryList, countryName } from "@/lib/countries";
import { formatDay } from "@/lib/capsules";
import { planErrorMessage } from "@/lib/plans";

/** Every leaf path of a dictionary (functions count as leaves). */
function paths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
}

describe("dictionaries", () => {
  it("Mongolian has exactly the same keys as English", () => {
    expect(paths(mn).sort()).toEqual(paths(en).sort());
  });

  it("no Mongolian string is empty", () => {
    const empty = paths(mn).filter((p) => {
      const v = p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], mn);
      return typeof v === "string" && v.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("arrays have the same length in both languages", () => {
    expect(mn.home.features).toHaveLength(en.home.features.length);
    expect(mn.year.months).toHaveLength(12);
    for (const id of ["free", "premium", "legacy"] as const) {
      expect(mn.plans[id].features).toHaveLength(en.plans[id].features.length);
    }
  });
});

describe("language detection", () => {
  it("reads Accept-Language", () => {
    expect(fromAcceptLanguage("mn-MN,mn;q=0.9,en;q=0.8")).toBe("mn");
    expect(fromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("en");
    expect(fromAcceptLanguage("ja")).toBe("en");
    expect(fromAcceptLanguage(null)).toBe("en");
  });
  it("validates locales", () => {
    expect(isLocale("mn")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

describe("localized formatting", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  it("countdown in Mongolian", () => {
    expect(countdownText("2027-11-11T12:00:00Z", now, mn)).toBe("1 жилийн дараа нээгдэнэ");
    expect(countdownText("2026-11-11T15:00:00Z", now, mn)).toBe("3 цагийн дараа нээгдэнэ");
    expect(countdownText("2028-11-21T12:00:00Z", now, mn)).toMatch(/^2 жил \d+ хоногийн дараа нээгдэнэ$/);
    expect(countdownText("2020-01-01T00:00:00Z", now, mn)).toBe("Нээгдсэн");
  });
  it("country names in Mongolian with English fallback", () => {
    expect(countryName("MNG", "mn")).toBe("Монгол");
    expect(countryName("JPN", "mn")).toBe("Япон");
    expect(countryName("MNG", "en")).toBe("Mongolia");
    expect(countryName("XXX", "mn")).toBe("XXX");
    expect(countryList("mn").length).toBe(countryList("en").length);
    // stored data, not Intl — must work in browsers without Mongolian locale data
    expect(countryList("mn").every(([, name]) => /[А-Яа-яЁёӨөҮү]/.test(name))).toBe(true);
  });
  it("dates in Mongolian without relying on browser locale data", () => {
    expect(formatDay("2024-07-15", "mn")).toBe("2024 оны 7-р сарын 15");
    expect(formatDay("2024-01-01", "mn")).toBe("2024 оны 1-р сарын 1");
    expect(formatDay("2024-07-15", "en")).toBe("Jul 15, 2024");
  });
  it("database errors in Mongolian", () => {
    expect(planErrorMessage("PLAN_VIDEO", mn)).toBe(mn.planErrors.video);
  });
});
