import type { Client, MatchLevel, Property } from "@/types/database";

export const MATCH_WEIGHTS = {
  budget: 35,
  bedrooms: 25,
  bathrooms: 10,
  suburb: 20,
  propertyType: 10,
} as const;

const TOTAL_WEIGHT = Object.values(MATCH_WEIGHTS).reduce(
  (total, weight) => total + weight,
  0,
);

export type HardConstraintViolation = {
  criterion: "budget" | "bedrooms" | "bathrooms";
  message: string;
  severity: "mild" | "moderate" | "severe";
};

export type MatchEvaluation = {
  score: number;
  dataCompleteness: number;
  matchLevel: MatchLevel;
  reasons: string[];
  hardConstraintViolations: HardConstraintViolation[];
};

type CriterionResult = {
  weight: number;
  applicable: boolean;
  known: boolean;
  earned: boolean;
  violated?: HardConstraintViolation;
};

function normalizeText(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function roundPercent(value: number) {
  return Math.round(value * 100);
}

function getBudgetResult(
  property: Pick<Property, "estimated_price">,
  client: Pick<Client, "max_budget">,
  reasons: string[],
): CriterionResult {
  const weight = MATCH_WEIGHTS.budget;

  if (client.max_budget === null) {
    return { weight, applicable: false, known: false, earned: false };
  }

  if (property.estimated_price === null) {
    reasons.push("Estimated price is unavailable, so budget fit is uncertain.");
    return { weight, applicable: true, known: false, earned: false };
  }

  if (property.estimated_price <= client.max_budget) {
    reasons.push(
      `Estimated price is within the client's maximum budget of ${formatCurrency(
        client.max_budget,
      )}.`,
    );
    return { weight, applicable: true, known: true, earned: true };
  }

  const overByPercent =
    (property.estimated_price - client.max_budget) / client.max_budget;
  const severity =
    overByPercent <= 0.1
      ? "mild"
      : overByPercent <= 0.2
        ? "moderate"
        : "severe";

  return {
    weight,
    applicable: true,
    known: true,
    earned: false,
    violated: {
      criterion: "budget",
      severity,
      message: `Estimated price is ${formatCurrency(
        property.estimated_price,
      )}, which is ${roundPercent(overByPercent)}% above the client's maximum budget.`,
    },
  };
}

function getBedroomsResult(
  property: Pick<Property, "bedrooms">,
  client: Pick<Client, "min_bedrooms">,
  reasons: string[],
): CriterionResult {
  const weight = MATCH_WEIGHTS.bedrooms;

  if (client.min_bedrooms === null) {
    return { weight, applicable: false, known: false, earned: false };
  }

  if (property.bedrooms === null) {
    reasons.push("Bedroom count is unavailable, so bedroom fit is uncertain.");
    return { weight, applicable: true, known: false, earned: false };
  }

  if (property.bedrooms >= client.min_bedrooms) {
    reasons.push(
      `Bedroom count meets the client's minimum of ${client.min_bedrooms}.`,
    );
    return { weight, applicable: true, known: true, earned: true };
  }

  const deficit = client.min_bedrooms - property.bedrooms;

  return {
    weight,
    applicable: true,
    known: true,
    earned: false,
    violated: {
      criterion: "bedrooms",
      severity: deficit <= 1 ? "mild" : "severe",
      message: `Property has ${property.bedrooms} bedrooms, below the client's minimum of ${client.min_bedrooms}.`,
    },
  };
}

function getBathroomsResult(
  property: Pick<Property, "bathrooms">,
  client: Pick<Client, "min_bathrooms">,
  reasons: string[],
): CriterionResult {
  const weight = MATCH_WEIGHTS.bathrooms;

  if (client.min_bathrooms === null) {
    return { weight, applicable: false, known: false, earned: false };
  }

  if (property.bathrooms === null) {
    reasons.push("Bathroom count is unavailable, so bathroom fit is uncertain.");
    return { weight, applicable: true, known: false, earned: false };
  }

  if (property.bathrooms >= client.min_bathrooms) {
    reasons.push(
      `Bathroom count meets the client's minimum of ${client.min_bathrooms}.`,
    );
    return { weight, applicable: true, known: true, earned: true };
  }

  const deficit = client.min_bathrooms - property.bathrooms;

  return {
    weight,
    applicable: true,
    known: true,
    earned: false,
    violated: {
      criterion: "bathrooms",
      severity: deficit <= 1 ? "mild" : "severe",
      message: `Property has ${property.bathrooms} bathrooms, below the client's minimum of ${client.min_bathrooms}.`,
    },
  };
}

function getSuburbResult(
  property: Pick<Property, "suburb">,
  client: Pick<Client, "preferred_suburbs">,
  reasons: string[],
): CriterionResult {
  const weight = MATCH_WEIGHTS.suburb;

  if (client.preferred_suburbs.length === 0) {
    return { weight, applicable: false, known: false, earned: false };
  }

  if (!property.suburb) {
    reasons.push("Suburb is unavailable, so location preference is uncertain.");
    return { weight, applicable: true, known: false, earned: false };
  }

  const preferredSuburbs = client.preferred_suburbs.map(normalizeText);
  const earned = preferredSuburbs.includes(normalizeText(property.suburb));

  if (earned) {
    reasons.push("Suburb matches the client's preferred suburbs.");
  } else {
    reasons.push(
      "Suburb is outside the client's exact preferred suburbs; nearby-suburb scoring is a future enhancement.",
    );
  }

  return { weight, applicable: true, known: true, earned };
}

function getPropertyTypeResult(
  property: Pick<Property, "property_type">,
  client: Pick<Client, "property_types">,
  reasons: string[],
): CriterionResult {
  const weight = MATCH_WEIGHTS.propertyType;

  if (client.property_types.length === 0) {
    return { weight, applicable: false, known: false, earned: false };
  }

  if (!property.property_type) {
    reasons.push(
      "Property type is unavailable, so property-type preference is uncertain.",
    );
    return { weight, applicable: true, known: false, earned: false };
  }

  const propertyTypes = client.property_types.map(normalizeText);
  const earned = propertyTypes.includes(normalizeText(property.property_type));

  if (earned) {
    reasons.push("Property type matches the client's preferences.");
  } else {
    reasons.push("Property type is outside the client's preferred types.");
  }

  return { weight, applicable: true, known: true, earned };
}

function calculateMatchLevel(
  score: number,
  dataCompleteness: number,
  criteria: CriterionResult[],
  hardConstraintViolations: HardConstraintViolation[],
): MatchLevel {
  const severeViolation = hardConstraintViolations.some(
    (violation) => violation.severity === "severe",
  );

  if (hardConstraintViolations.length === 0) {
    if (score >= 80 && dataCompleteness >= 70) {
      return "strong";
    }

    return score >= 45 || (score >= 30 && dataCompleteness < 70)
      ? "possible"
      : "unlikely";
  }

  const nonViolatedCriteria = criteria.filter(
    (criterion) => criterion.applicable && !criterion.violated,
  );
  const supportingWeight = nonViolatedCriteria.reduce(
    (total, criterion) => total + criterion.weight,
    0,
  );
  const supportingPoints = nonViolatedCriteria.reduce(
    (total, criterion) => total + (criterion.earned ? criterion.weight : 0),
    0,
  );
  const supportingScore =
    supportingWeight > 0 ? Math.round((supportingPoints / supportingWeight) * 100) : 0;

  if (
    hardConstraintViolations.length === 1 &&
    !severeViolation &&
    score >= 60 &&
    supportingScore >= 85 &&
    dataCompleteness >= 70
  ) {
    return "stretch";
  }

  if (!severeViolation && score >= 45 && dataCompleteness >= 60) {
    return "possible";
  }

  return "unlikely";
}

export function evaluatePropertyClientMatch(
  property: Pick<
    Property,
    | "estimated_price"
    | "bedrooms"
    | "bathrooms"
    | "suburb"
    | "property_type"
  >,
  client: Pick<
    Client,
    | "max_budget"
    | "min_bedrooms"
    | "min_bathrooms"
    | "preferred_suburbs"
    | "property_types"
  >,
): MatchEvaluation {
  const reasons: string[] = [];
  const criteria = [
    getBudgetResult(property, client, reasons),
    getBedroomsResult(property, client, reasons),
    getBathroomsResult(property, client, reasons),
    getSuburbResult(property, client, reasons),
    getPropertyTypeResult(property, client, reasons),
  ];
  const applicableWeight = criteria.reduce(
    (total, criterion) =>
      total + (criterion.applicable ? criterion.weight : 0),
    0,
  );
  const earnedPoints = criteria.reduce(
    (total, criterion) => total + (criterion.earned ? criterion.weight : 0),
    0,
  );
  const knownWeight = criteria.reduce(
    (total, criterion) => total + (criterion.known ? criterion.weight : 0),
    0,
  );
  const hardConstraintViolations = criteria
    .map((criterion) => criterion.violated)
    .filter((violation): violation is HardConstraintViolation => Boolean(violation));
  const score =
    applicableWeight > 0
      ? Math.round((earnedPoints / applicableWeight) * TOTAL_WEIGHT)
      : 0;
  const dataCompleteness =
    applicableWeight > 0
      ? Math.round((knownWeight / applicableWeight) * TOTAL_WEIGHT)
      : 0;

  if (applicableWeight === 0) {
    reasons.push("Client has no scored criteria configured yet.");
  }

  return {
    score,
    dataCompleteness,
    matchLevel: calculateMatchLevel(
      score,
      dataCompleteness,
      criteria,
      hardConstraintViolations,
    ),
    reasons,
    hardConstraintViolations,
  };
}
