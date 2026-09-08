import Link from "next/link";

import {
  PropertyMatchList,
  sortMatches,
  type PropertyMatchDisplay,
} from "@/components/property-match-list";
import { lookupStatusClass, matchLevelClass, StatusBadge } from "@/components/status-badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

type DashboardProperty = {
  id: string;
  input_address: string;
  address_line: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  estimated_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  property_type: string | null;
  lookup_status: string;
  lookup_error: string | null;
  review_status: string;
  created_at: string;
};

function formatCurrency(value: number | null) {
  return value === null ? "Estimate unavailable" : currencyFormatter.format(value);
}

function formatAttribute(label: string, value: number | string | null) {
  return value === null || value === "" ? `${label}: unknown` : `${label}: ${value}`;
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

function getUsefulMatches(matches: PropertyMatchDisplay[]) {
  return sortMatches(
    matches.filter((match) => match.match_level !== "unlikely"),
  ).slice(0, 3);
}

function getOpportunityLabels(
  property: DashboardProperty,
  usefulMatches: PropertyMatchDisplay[],
) {
  if (property.lookup_status === "failed") {
    return [
      {
        label: "Failed lookup",
        className: lookupStatusClass("failed"),
      },
    ];
  }

  const missingFields = [
    property.estimated_price,
    property.bedrooms,
    property.bathrooms,
    property.suburb,
    property.property_type,
  ].filter((value) => value === null || value === "").length;

  const bestLevel = usefulMatches[0]?.match_level;
  const labels = bestLevel
    ? [
        {
          label: `${bestLevel} match`,
          className: matchLevelClass(bestLevel),
        },
      ]
    : [
        {
          label: "No useful matches",
          className: "bg-slate-100 text-slate-700 ring-slate-200",
        },
      ];

  if (missingFields > 0) {
    labels.push({
      label: "Incomplete data",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
    });
  }

  return labels;
}

function metricLabel(count: number | null) {
  return count === null ? "-" : count.toString();
}

function propertyLocation(property: DashboardProperty) {
  return [property.suburb, property.state, property.postcode]
    .filter(Boolean)
    .join(" ");
}

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const [
    clientsCountResult,
    newPropertiesCountResult,
    strongMatchesCountResult,
    stretchMatchesCountResult,
    propertiesResult,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "new"),
    supabase
      .from("property_client_matches")
      .select("id", { count: "exact", head: true })
      .eq("match_level", "strong"),
    supabase
      .from("property_client_matches")
      .select("id", { count: "exact", head: true })
      .eq("match_level", "stretch"),
    supabase
      .from("properties")
      .select(
        "id, input_address, address_line, suburb, state, postcode, estimated_price, bedrooms, bathrooms, parking, property_type, lookup_status, lookup_error, review_status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const properties = (propertiesResult.data ?? []) as DashboardProperty[];
  const propertyIds = properties.map((property) => property.id);
  const matchesResult =
    propertyIds.length > 0
      ? await supabase
          .from("property_client_matches")
          .select(
            "property_id, client_id, score, data_completeness, match_level, reasons, hard_constraint_violations, clients(name)",
          )
          .in("property_id", propertyIds)
          .in("match_level", ["strong", "stretch", "possible"])
      : { data: [], error: null };

  const hasError =
    Boolean(clientsCountResult.error) ||
    Boolean(newPropertiesCountResult.error) ||
    Boolean(strongMatchesCountResult.error) ||
    Boolean(stretchMatchesCountResult.error) ||
    Boolean(propertiesResult.error) ||
    Boolean(matchesResult.error);
  const matches = (matchesResult.data ?? []) as PropertyMatchDisplay[];
  const matchesByProperty = groupMatches(matches);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Property opportunities
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review recently imported properties against Neil&apos;s buyer
            criteria, with the strongest opportunities surfaced first on each
            property.
          </p>
        </div>
        <Link
          href="/import"
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Import properties
        </Link>
      </section>

      {hasError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Dashboard information could not be loaded right now. Please try again
          shortly.
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Active clients
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {metricLabel(clientsCountResult.count)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                New properties
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {metricLabel(newPropertiesCountResult.count)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Strong matches
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {metricLabel(strongMatchesCountResult.count)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Stretch matches
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {metricLabel(stretchMatchesCountResult.count)}
              </p>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Recent opportunities
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Newest properties first, with useful client matches shown for
                  quick review.
                </p>
              </div>
              <Link
                href="/properties"
                className="hidden text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline sm:inline"
              >
                View all properties
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
                No properties have been imported yet. Start by importing a
                batch of complete Australian addresses.
              </div>
            ) : (
              <div className="grid gap-4">
                {properties.map((property) => {
                  const usefulMatches = getUsefulMatches(
                    matchesByProperty.get(property.id) ?? [],
                  );
                  const labels = getOpportunityLabels(property, usefulMatches);

                  return (
                    <article
                      key={property.id}
                      className="rounded-md border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {labels.map((label) => (
                              <StatusBadge
                                key={label.label}
                                className={label.className}
                              >
                                {label.label}
                              </StatusBadge>
                            ))}
                            <StatusBadge
                              className={lookupStatusClass(
                                property.lookup_status,
                              )}
                            >
                              Lookup {property.lookup_status}
                            </StatusBadge>
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-950">
                            {property.address_line ?? property.input_address}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {propertyLocation(property) || "Location unknown"}
                          </p>
                          {property.lookup_error ? (
                            <p className="mt-2 text-sm text-red-700">
                              Property details could not be completed from this
                              address.
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                            <span>{formatCurrency(property.estimated_price)}</span>
                            <span>
                              {formatAttribute("Beds", property.bedrooms)}
                            </span>
                            <span>
                              {formatAttribute("Baths", property.bathrooms)}
                            </span>
                            <span>
                              {formatAttribute("Parking", property.parking)}
                            </span>
                            <span className="capitalize">
                              {formatAttribute("Type", property.property_type)}
                            </span>
                          </div>
                        </div>

                        <div className="w-full border-t border-slate-100 pt-4 lg:w-[440px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                          <h4 className="mb-3 text-sm font-semibold text-slate-950">
                            Top client matches
                          </h4>
                          {property.lookup_status === "failed" ? (
                            <p className="text-sm text-slate-600">
                              Matching is skipped until property details are
                              available.
                            </p>
                          ) : (
                            <PropertyMatchList
                              matches={matchesByProperty.get(property.id) ?? []}
                              emptyText="No strong, stretch, or possible matches yet."
                              usefulOnly
                            />
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
