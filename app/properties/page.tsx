import {
  PropertyMatchList,
  type PropertyMatchDisplay,
} from "@/components/property-match-list";
import { PageHeader } from "@/components/page-header";
import { lookupStatusClass, StatusBadge } from "@/components/status-badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number | null) {
  return value === null ? "Unavailable" : currencyFormatter.format(value);
}

function formatNumber(value: number | null) {
  return value === null ? "-" : value.toString();
}

function formatText(value: string | null) {
  return value && value.trim().length > 0 ? value : "-";
}

function groupMatches(matches: PropertyMatchDisplay[]) {
  const grouped = new Map<string, PropertyMatchDisplay[]>();

  for (const match of matches) {
    const propertyMatches = grouped.get(match.property_id) ?? [];
    propertyMatches.push(match);
    grouped.set(match.property_id, propertyMatches);
  }

  return grouped;
}

function hasIncompleteData(property: {
  estimated_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  suburb: string | null;
  property_type: string | null;
}) {
  return [
    property.estimated_price,
    property.bedrooms,
    property.bathrooms,
    property.suburb,
    property.property_type,
  ].some((value) => value === null || value === "");
}

export default async function PropertiesPage() {
  const supabase = createServerSupabaseClient();
  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      "id, input_address, address_line, suburb, state, postcode, estimated_price, bedrooms, bathrooms, parking, property_type, lookup_status, lookup_error, review_status, created_at",
    )
    .order("created_at", { ascending: false });
  const propertyIds = properties?.map((property) => property.id) ?? [];
  const { data: matches, error: matchesError } =
    propertyIds.length > 0
      ? await supabase
          .from("property_client_matches")
          .select(
            "property_id, client_id, score, data_completeness, match_level, reasons, hard_constraint_violations, clients(name)",
          )
          .in("property_id", propertyIds)
      : { data: [], error: null };
  const matchesByProperty = groupMatches((matches ?? []) as PropertyMatchDisplay[]);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Properties"
          description="Review imported properties first, including lookup failures and incomplete data."
        />
        <Link
          href="/import"
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Import properties
        </Link>
      </div>

      {error || matchesError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Properties could not be loaded right now. Please try again shortly.
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
          No properties have been imported yet. Start with a batch of complete
          Australian addresses.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Estimate</th>
                <th className="px-4 py-3">Beds</th>
                <th className="px-4 py-3">Baths</th>
                <th className="px-4 py-3">Parking</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Lookup</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Top Matches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((property) => {
                const propertyMatches = matchesByProperty.get(property.id) ?? [];

                return (
                  <tr key={property.id} className="align-top">
                    <td className="min-w-72 px-4 py-3">
                        <div className="font-medium text-slate-950">
                          {property.address_line ?? property.input_address}
                        </div>
                        {property.lookup_status === "success" &&
                        hasIncompleteData(property) ? (
                          <div className="mt-1 text-xs font-medium text-amber-800">
                            Incomplete property details.
                          </div>
                        ) : null}
                      {property.lookup_error ? (
                        <div className="mt-1 max-w-80 text-xs text-red-700">
                          {property.lookup_error}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {[property.suburb, property.state, property.postcode]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCurrency(property.estimated_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatNumber(property.bedrooms)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatNumber(property.bathrooms)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatNumber(property.parking)}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {formatText(property.property_type)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        className={lookupStatusClass(property.lookup_status)}
                      >
                        {property.lookup_status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        className={lookupStatusClass(property.review_status)}
                      >
                        {property.review_status}
                      </StatusBadge>
                    </td>
                    <td className="min-w-96 px-4 py-3">
                      {property.lookup_status === "failed" ? (
                        <p className="text-xs text-slate-500">
                          Matching skipped until lookup succeeds.
                        </p>
                      ) : propertyMatches.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No matches calculated yet.
                        </p>
                      ) : (
                        <PropertyMatchList
                          matches={propertyMatches}
                          emptyText="No matches calculated yet."
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
