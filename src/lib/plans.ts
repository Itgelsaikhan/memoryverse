import en, { type Dictionary } from "@/i18n/dictionaries/en";

export type PlanId = "free" | "premium" | "legacy";
export type Period = "month" | "year";

export type PlanDef = {
  id: PlanId;
  name: string;
  tagline: string;
  prices: Partial<Record<Period, number>>; // USD cents — must match plan_price_cents() in the database
  features: string[];
  maxUnlockYears: number;
};

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Start your universe",
    prices: { month: 0 },
    features: ["50 capsules", "Photos & voice notes", "Seal capsules for up to 5 years", "Humanity Map & Analytics"],
    maxUnlockYears: 5,
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "For a lifetime of memories",
    prices: { month: 400, year: 4000 },
    features: [
      "Unlimited capsules",
      "Video capsules",
      "Seal capsules for up to 50 years",
      "Personal Year in Review",
    ],
    maxUnlockYears: 50,
  },
  {
    id: "legacy",
    name: "Legacy",
    tagline: "Your story, passed on",
    prices: { year: 3900 },
    features: [
      "Everything in Premium",
      "Up to 5 trusted contacts",
      "Memories delivered if you're inactive for a chosen time",
      "Preview exactly what they'll receive",
    ],
    maxUnlockYears: 50,
  },
];

export function planDef(id: string | null | undefined) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function formatPrice(cents: number) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

export type MyPlan = {
  plan: PlanId;
  effective_plan: PlanId;
  renews_at: string | null;
  cancel_at_period_end: boolean;
  capsule_count: number;
  legacy_inactivity_days: number;
};

/** Friendly messages for errors raised by the database */
export function planErrorMessage(message: string, t: Dictionary = en) {
  const e = t.planErrors;
  if (message.includes("FREE_LIMIT_REACHED")) return e.freeLimit;
  if (message.includes("PLAN_UNLOCK_LIMIT")) return e.unlockLimit;
  if (message.includes("PLAN_VIDEO")) return e.video;
  if (message.includes("UNLOCK_TOO_FAR")) return e.tooFar;
  if (message.includes("PLAN_LEGACY_REQUIRED")) return e.legacyRequired;
  if (message.includes("LEGACY_CONTACT_LIMIT")) return e.contactLimit;
  return null;
}
