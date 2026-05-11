import { describe, it, expect } from "vitest";
import { parseSynthesisOutput } from "../anthropic-synthesis";

describe("parseSynthesisOutput", () => {
  it("parses a well-formed synthesis JSON block", () => {
    const out = `Here is your ICP:
\`\`\`json
{
  "icp": {
    "offer": "We help solar installers book more inspections",
    "industries": ["Solar", "Renewable energy"],
    "titles": ["Owner", "Sales manager"],
    "sizeMin": 5,
    "sizeMax": 30,
    "locations": ["Cape Town", "Johannesburg"],
    "intentSignals": ["recent hire", "active LinkedIn"],
    "dealValueZar": 25000
  },
  "provenance": {
    "industries": { "source": "site_hero", "evidence": "Solar installation specialists" },
    "locations": { "source": "gbp_location", "evidence": "Cape Town, Western Cape" }
  }
}
\`\`\``;
    const parsed = parseSynthesisOutput(out);
    expect(parsed.icp.industries).toContain("Solar");
    expect(parsed.icp.dealValueZar).toBe(25000);
    expect(parsed.provenance.industries?.source).toBe("site_hero");
  });

  it("parses bare JSON without code fence", () => {
    const out = `{"icp":{"offer":"x","industries":["a"],"titles":["b"],"sizeMin":1,"sizeMax":5,"locations":["c"],"intentSignals":["d"],"dealValueZar":1},"provenance":{}}`;
    const parsed = parseSynthesisOutput(out);
    expect(parsed.icp.industries).toEqual(["a"]);
  });

  it("throws on missing required fields", () => {
    expect(() => parseSynthesisOutput('{"icp":{}}')).toThrow();
  });
});
