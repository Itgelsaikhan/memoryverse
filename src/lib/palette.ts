// Categorical series colors, validated for the dark surface (dataviz validator:
// CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3, all ≥ 3:1 contrast). Assign in this order, never cycle.
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"];
export const NEUTRAL = "#9aa0b8";

export const TOPIC_ORDER = [
  "achievement",
  "affection",
  "bonding",
  "enjoy_the_moment",
  "leisure",
  "nature",
  "exercise",
] as const;
