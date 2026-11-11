import type { Locale } from "../config";
import en from "./en";
import mn from "./mn";

export type { Dictionary } from "./en";

const DICTIONARIES = { en, mn } as const;

export function getDictionary(locale: Locale) {
  return DICTIONARIES[locale] ?? en;
}
