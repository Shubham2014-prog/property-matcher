import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { evaluatePropertyClientMatch } from "@/lib/matching/scoring";
import type { Database, Json } from "@/types/database";

type ClientMatchInput = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  | "id"
  | "max_budget"
  | "min_bedrooms"
  | "min_bathrooms"
  | "preferred_suburbs"
  | "property_types"
>;

type PropertyMatchInput = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  | "id"
  | "lookup_status"
  | "estimated_price"
  | "bedrooms"
  | "bathrooms"
  | "suburb"
  | "property_type"
>;

type MatchInsert =
  Database["public"]["Tables"]["property_client_matches"]["Insert"];

function toJson(value: unknown): Json {
  return value as Json;
}

function buildMatchRows(
  properties: PropertyMatchInput[],
  clients: ClientMatchInput[],
) {
  const updatedAt = new Date().toISOString();
  const rows: MatchInsert[] = [];

  for (const property of properties) {
    if (property.lookup_status !== "success") {
      continue;
    }

    for (const client of clients) {
      const match = evaluatePropertyClientMatch(property, client);

      rows.push({
        property_id: property.id,
        client_id: client.id,
        score: match.score,
        data_completeness: match.dataCompleteness,
        match_level: match.matchLevel,
        reasons: toJson(match.reasons),
        hard_constraint_violations: toJson(match.hardConstraintViolations),
        updated_at: updatedAt,
      });
    }
  }

  return rows;
}

async function upsertMatchRows(
  supabase: SupabaseClient<Database>,
  rows: MatchInsert[],
) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("property_client_matches")
    .upsert(rows, { onConflict: "property_id,client_id" });

  if (error) {
    throw new Error("Property-client matches could not be persisted.");
  }
}

export async function recomputeMatchesForProperty(
  supabase: SupabaseClient<Database>,
  propertyId: string,
) {
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select(
      "id, lookup_status, estimated_price, bedrooms, bathrooms, suburb, property_type",
    )
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    throw new Error("Property could not be loaded for matching.");
  }

  if (property.lookup_status !== "success") {
    await supabase
      .from("property_client_matches")
      .delete()
      .eq("property_id", propertyId);
    return;
  }

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select(
      "id, max_budget, min_bedrooms, min_bathrooms, preferred_suburbs, property_types",
    );

  if (clientsError || !clients) {
    throw new Error("Clients could not be loaded for matching.");
  }

  await upsertMatchRows(supabase, buildMatchRows([property], clients));
}

export async function recomputeMatchesForClient(
  supabase: SupabaseClient<Database>,
  clientId: string,
) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, max_budget, min_bedrooms, min_bathrooms, preferred_suburbs, property_types",
    )
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    throw new Error("Client could not be loaded for matching.");
  }

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select(
      "id, lookup_status, estimated_price, bedrooms, bathrooms, suburb, property_type",
    )
    .eq("lookup_status", "success");

  if (propertiesError || !properties) {
    throw new Error("Properties could not be loaded for matching.");
  }

  await upsertMatchRows(supabase, buildMatchRows(properties, [client]));
}

export async function recomputeAllPropertyClientMatches(
  supabase: SupabaseClient<Database>,
) {
  const [{ data: properties, error: propertiesError }, { data: clients, error: clientsError }] =
    await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, lookup_status, estimated_price, bedrooms, bathrooms, suburb, property_type",
        )
        .eq("lookup_status", "success"),
      supabase
        .from("clients")
        .select(
          "id, max_budget, min_bedrooms, min_bathrooms, preferred_suburbs, property_types",
        ),
    ]);

  if (propertiesError || !properties) {
    throw new Error("Properties could not be loaded for matching.");
  }

  if (clientsError || !clients) {
    throw new Error("Clients could not be loaded for matching.");
  }

  await upsertMatchRows(supabase, buildMatchRows(properties, clients));
}
