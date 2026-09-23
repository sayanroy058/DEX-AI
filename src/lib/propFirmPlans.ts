export const propFirmPrograms = ["One-Step", "Two-Step", "Instant Funding"] as const;
export type PropFirmProgram = (typeof propFirmPrograms)[number];

export function formatPropFirmProgram(program: PropFirmProgram) {
  if (program === "One-Step") return "1-Step Challenge";
  if (program === "Two-Step") return "2-Step Challenge";
  return "Instant Funding";
}

export const propFirmSizes = [5000, 10000, 25000, 50000, 100000] as const;
export type PropFirmSize = (typeof propFirmSizes)[number];

const prices: Record<PropFirmProgram, Record<PropFirmSize, number>> = {
  "Two-Step": { 5000: 59, 10000: 109, 25000: 219, 50000: 349, 100000: 699 },
  "One-Step": { 5000: 69, 10000: 119, 25000: 239, 50000: 399, 100000: 749 },
  "Instant Funding": { 5000: 399, 10000: 799, 25000: 1999, 50000: 3999, 100000: 7999 },
};

export const propFirmUrl = import.meta.env.VITE_PROPFIRM_URL || "http://localhost:3000";

export function getPropFirmPrice(program: PropFirmProgram, size: PropFirmSize) {
  return prices[program][size];
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatAccountSize(value: PropFirmSize) {
  return `$${value.toLocaleString("en-US")}`;
}

export const propFirmRuleSummary: Record<PropFirmProgram, string[]> = {
  "One-Step": [
    "Maximum leverage: 5x",
    "Evaluation max loss: 6%",
    "Funded daily loss: 4%",
    "Funded total loss: 6%",
  ],
  "Two-Step": [
    "Maximum leverage: 5x",
    "Step 1 and Step 2 evaluation loss limits still require confirmation",
    "Funded daily loss: 5%",
    "Funded total loss: 8%",
  ],
  "Instant Funding": [
    "Maximum leverage: 5x",
    "Total loss: 4%",
    "Daily loss rule has not yet been supplied",
    "Evaluation bypass is still to be confirmed",
  ],
};
