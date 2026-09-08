import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluatePropertyClientMatch } from "./scoring";
import type { Client, Property } from "@/types/database";

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    name: "Demo Client",
    email: null,
    phone: null,
    max_budget: 1_000_000,
    min_bedrooms: 3,
    min_bathrooms: 2,
    preferred_suburbs: ["Palm Beach"],
    property_types: ["house"],
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: "property-1",
    import_batch_id: null,
    input_address: "1 Demo Street Palm Beach, QLD 4221",
    normalized_address: "1 demo street palm beach qld 4221",
    address_line: "1 Demo Street",
    suburb: "Palm Beach",
    state: "QLD",
    postcode: "4221",
    estimated_price: 950_000,
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    property_type: "house",
    lookup_status: "success",
    lookup_error: null,
    raw_property_data: null,
    review_status: "new",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("evaluatePropertyClientMatch", () => {
  it("classifies an obvious fit as a strong match", () => {
    const match = evaluatePropertyClientMatch(property(), client());

    assert.equal(match.score, 100);
    assert.equal(match.dataCompleteness, 100);
    assert.equal(match.matchLevel, "strong");
    assert.deepEqual(match.hardConstraintViolations, []);
  });

  it("classifies a slightly over-budget but otherwise excellent fit as stretch", () => {
    const match = evaluatePropertyClientMatch(
      property({ estimated_price: 1_050_000 }),
      client(),
    );

    assert.equal(match.score, 65);
    assert.equal(match.dataCompleteness, 100);
    assert.equal(match.matchLevel, "stretch");
    assert.equal(match.hardConstraintViolations[0]?.criterion, "budget");
    assert.equal(match.hardConstraintViolations[0]?.severity, "mild");
  });

  it("classifies a substantially over-budget property as unlikely", () => {
    const match = evaluatePropertyClientMatch(
      property({ estimated_price: 1_400_000 }),
      client(),
    );

    assert.equal(match.matchLevel, "unlikely");
    assert.equal(match.hardConstraintViolations[0]?.criterion, "budget");
    assert.equal(match.hardConstraintViolations[0]?.severity, "severe");
  });

  it("records insufficient bedrooms as a hard constraint violation", () => {
    const match = evaluatePropertyClientMatch(property({ bedrooms: 2 }), client());

    assert.notEqual(match.matchLevel, "strong");
    assert.equal(match.hardConstraintViolations[0]?.criterion, "bedrooms");
  });

  it("does not award free points for incomplete property data", () => {
    const match = evaluatePropertyClientMatch(
      property({
        estimated_price: null,
        bedrooms: null,
        bathrooms: null,
      }),
      client(),
    );

    assert.equal(match.score, 30);
    assert.match(match.reasons.join(" "), /unavailable/i);
  });

  it("lowers data completeness when property data is incomplete", () => {
    const complete = evaluatePropertyClientMatch(property(), client());
    const incomplete = evaluatePropertyClientMatch(
      property({
        estimated_price: null,
        bedrooms: null,
        bathrooms: null,
      }),
      client(),
    );

    assert.equal(complete.dataCompleteness, 100);
    assert.equal(incomplete.dataCompleteness, 30);
  });

  it("adds score for preferred suburb matches", () => {
    const outsideSuburb = evaluatePropertyClientMatch(
      property({ suburb: "Robina" }),
      client(),
    );
    const preferredSuburb = evaluatePropertyClientMatch(property(), client());

    assert.equal(preferredSuburb.score - outsideSuburb.score, 20);
  });

  it("adds score for preferred property type matches", () => {
    const wrongType = evaluatePropertyClientMatch(
      property({ property_type: "apartment" }),
      client(),
    );
    const preferredType = evaluatePropertyClientMatch(property(), client());

    assert.equal(preferredType.score - wrongType.score, 10);
  });
});
