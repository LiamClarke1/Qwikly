import { describe, it, expect } from "vitest";
import { wholesaleCapForPlan, isOverCap } from "../cap-check";

describe("wholesaleCapForPlan", () => {
  it("returns 25000 cents (R250) for pipeline_lite", () => {
    expect(wholesaleCapForPlan("pipeline_lite")).toBe(25000);
  });
  it("returns 75000 cents (R750) for pipeline_pro", () => {
    expect(wholesaleCapForPlan("pipeline_pro")).toBe(75000);
  });
  it("returns 0 (no cap, blocked) for an Inbound-only plan", () => {
    expect(wholesaleCapForPlan("starter")).toBe(0);
  });
});

describe("isOverCap", () => {
  it("returns true when spent + projected exceeds cap", () => {
    expect(isOverCap({ spentCents: 20000, projectedCents: 6000, capCents: 25000 })).toBe(true);
  });
  it("returns false when spent + projected equals cap exactly", () => {
    expect(isOverCap({ spentCents: 20000, projectedCents: 5000, capCents: 25000 })).toBe(false);
  });
  it("returns true when capCents is 0 and projectedCents is positive (blocked plan)", () => {
    expect(isOverCap({ spentCents: 0, projectedCents: 1, capCents: 0 })).toBe(true);
  });
});
