/** All monetary arithmetic goes through these helpers. Never do raw float math on ZAR columns. */

export function toZar(n: number): number {
  return Math.round(n * 100) / 100;
}

export function add(...amounts: number[]): number {
  return toZar(amounts.reduce((s, a) => s + a, 0));
}

export function subtract(a: number, b: number): number {
  return toZar(a - b);
}

export function multiply(a: number, b: number): number {
  return toZar(a * b);
}

export function pct(amount: number, rate: number): number {
  return toZar(amount * rate);
}

export function exVat(amountIncVat: number, vatRate = 0.15): number {
  return toZar(amountIncVat / (1 + vatRate));
}

export function vatPortion(amountIncVat: number, vatRate = 0.15): number {
  return toZar(amountIncVat - exVat(amountIncVat, vatRate));
}

export function commission(paidAmountExVat: number, rate = 0.08): number {
  return toZar(paidAmountExVat * rate);
}

export function fmt(amount: number): string {
  const isWhole = Number.isInteger(amount);
  return "R" + amount.toLocaleString("en-ZA", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateLong(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}
