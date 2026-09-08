import "server-only";

import type { Json } from "@/types/database";
import type { PropertyDataProvider, PropertyLookupResult } from "./types";

const HTAG_BASE_URL = "https://api.htagai.com/v1";

type HtagAddressGeocodeRecord = {
  address_key?: string | null;
  address_label?: string | null;
  flat_type?: string | null;
  flat_number?: string | null;
  level_type?: string | null;
  level_number?: string | null;
  number_first?: string | null;
  number_last?: string | null;
  street_name?: string | null;
  street_type?: string | null;
  street_suffix?: string | null;
  locality_name?: string | null;
  state?: string | null;
  postcode?: string | null;
};

type HtagPropertySummaryRecord = {
  property_type?: string | null;
  beds?: number | null;
  baths?: number | null;
  parking?: number | null;
};

type HtagPropertyEstimatesRecord = {
  price_estimate?: number | null;
};

type HtagListResponse<T> = {
  results?: T[];
  total?: number;
};

function sanitizeProviderError(message: string) {
  return message
    .replace(/https?:\/\/[^\s)]+/g, "[redacted-url]")
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[redacted-token]",
    )
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstResult<T>(response: HtagListResponse<T> | T | null): T | null {
  if (!response) {
    return null;
  }

  if (
    typeof response === "object" &&
    "results" in response &&
    Array.isArray(response.results)
  ) {
    return response.results[0] ?? null;
  }

  return response as T;
}

function buildAddressLine(record: HtagAddressGeocodeRecord) {
  const unit = [record.flat_type, record.flat_number].filter(Boolean).join(" ");
  const level = [record.level_type, record.level_number]
    .filter(Boolean)
    .join(" ");
  const streetNumber = [record.number_first, record.number_last]
    .filter(Boolean)
    .join("-");
  const street = [
    streetNumber,
    record.street_name,
    record.street_type,
    record.street_suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const parts = [unit, level, street].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : record.address_label ?? null;
}

async function htagGet<T>(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<T> {
  const url = new URL(`${HTAG_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const providerMessage =
      typeof data === "object" && data !== null && "detail" in data
        ? String(data.detail)
        : typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : text || `HtAG request failed with status ${response.status}`;

    throw new Error(sanitizeProviderError(providerMessage));
  }

  return data as T;
}

export class HtagPropertyDataProvider implements PropertyDataProvider {
  async lookup(address: string): Promise<PropertyLookupResult> {
    const apiKey = process.env.HTAG_API_KEY;

    if (!apiKey) {
      throw new Error("Missing HTAG_API_KEY.");
    }

    const geocode = await htagGet<HtagListResponse<HtagAddressGeocodeRecord>>(
      "/address/geocode",
      { address },
      apiKey,
    );
    const geocodeRecord = firstResult(geocode);

    if (!geocodeRecord?.address_key) {
      throw new Error("HtAG did not resolve an address key.");
    }

    const [summaryResponse, estimatesResponse] = await Promise.all([
      htagGet<HtagListResponse<HtagPropertySummaryRecord>>(
        "/property/summary",
        { address_key: geocodeRecord.address_key },
        apiKey,
      ),
      htagGet<HtagListResponse<HtagPropertyEstimatesRecord>>(
        "/property/estimates",
        { address_key: geocodeRecord.address_key, cma_method: "IA" },
        apiKey,
      ),
    ]);
    const summary = firstResult(summaryResponse);
    const estimates = firstResult(estimatesResponse);

    return {
      displayAddress: geocodeRecord.address_label ?? null,
      addressLine: buildAddressLine(geocodeRecord),
      suburb: geocodeRecord.locality_name ?? null,
      state: geocodeRecord.state ?? null,
      postcode: geocodeRecord.postcode ?? null,
      estimatedPrice: toNumber(estimates?.price_estimate),
      bedrooms: toNumber(summary?.beds),
      bathrooms: toNumber(summary?.baths),
      parking: toNumber(summary?.parking),
      propertyType: summary?.property_type ?? null,
      rawData: {
        provider: "htag",
        geocode: geocode as Json,
        summary: summaryResponse as Json,
        estimates: estimatesResponse as Json,
      },
    };
  }
}
