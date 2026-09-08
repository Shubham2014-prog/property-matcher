"use server";

import {
  looksLikeCompleteAustralianAddress,
  normalizeAddressForDuplicateCheck,
  splitAddressInput,
} from "@/lib/imports/normalize-address";
import { recomputeMatchesForProperty } from "@/lib/matching";
import { createPropertyDataProvider } from "@/lib/property-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type ImportProcessResult = ImportAddressResult & {
  countAs: "success" | "duplicate" | "failed";
};

export type ImportAddressResult = {
  address: string;
  status: "success" | "duplicate" | "failed";
  message?: string;
};

export type ImportFormState = {
  formError?: string;
  batchId?: string;
  totalAddresses?: number;
  successfulCount?: number;
  failedCount?: number;
  duplicateCount?: number;
  results?: ImportAddressResult[];
};

const IMPORT_CHUNK_SIZE = 3;

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  return message
    .replace(/https?:\/\/[^\s)]+/g, "[redacted-url]")
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[redacted-token]",
    )
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
}

async function runInChunks<T>(
  items: T[],
  chunkSize: number,
  handler: (item: T) => Promise<ImportProcessResult>,
) {
  const results: ImportProcessResult[] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    results.push(...(await Promise.all(chunk.map(handler))));
  }

  return results;
}

function buildFailedProperty(
  importBatchId: string,
  inputAddress: string,
  normalizedAddress: string,
  lookupError: string,
): PropertyInsert {
  return {
    import_batch_id: importBatchId,
    input_address: inputAddress,
    normalized_address: normalizedAddress,
    lookup_status: "failed",
    lookup_error: lookupError,
    raw_property_data: { provider: "none", error: lookupError },
  };
}

export async function importAddressesAction(
  _previousState: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const input = formData.get("addresses");
  const addresses = splitAddressInput(typeof input === "string" ? input : "");

  if (addresses.length === 0) {
    return { formError: "Paste at least one address." };
  }

  if (addresses.length > 100) {
    return { formError: "Import at most 100 non-empty addresses at a time." };
  }

  const supabase = createServerSupabaseClient();
  const provider = createPropertyDataProvider();
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({ total_addresses: addresses.length })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { formError: "Import batch could not be created." };
  }

  const seenNormalizedAddresses = new Set<string>();

  const results = await runInChunks(addresses, IMPORT_CHUNK_SIZE, async (address) => {
    const normalizedAddress = normalizeAddressForDuplicateCheck(address);

    if (seenNormalizedAddresses.has(normalizedAddress)) {
      return {
        address,
        status: "duplicate",
        countAs: "duplicate",
        message: "Duplicate within this pasted batch.",
      };
    }

    seenNormalizedAddresses.add(normalizedAddress);

    const { data: existingProperty, error: existingError } = await supabase
      .from("properties")
      .select("id")
      .eq("normalized_address", normalizedAddress)
      .maybeSingle();

    if (existingError) {
      return {
        address,
        status: "failed",
        countAs: "failed",
        message: "Could not check for existing property.",
      };
    }

    if (existingProperty) {
      return {
        address,
        status: "duplicate",
        countAs: "duplicate",
        message: "Already exists in stored properties.",
      };
    }

    if (!looksLikeCompleteAustralianAddress(address)) {
      const lookupError = "Address must include an Australian state and postcode.";
      const { error } = await supabase
        .from("properties")
        .insert(
          buildFailedProperty(
            batch.id,
            address,
            normalizedAddress,
            lookupError,
          ),
        );

      return {
        address,
        status: "failed",
        countAs: "failed",
        message: error ? "Could not store failed address." : lookupError,
      };
    }

    try {
      const lookup = await provider.lookup(address);
      const { data: insertedProperty, error } = await supabase
        .from("properties")
        .insert({
          import_batch_id: batch.id,
          input_address: address,
          normalized_address: normalizedAddress,
          address_line: lookup.addressLine ?? lookup.displayAddress,
          suburb: lookup.suburb,
          state: lookup.state,
          postcode: lookup.postcode,
          estimated_price: lookup.estimatedPrice,
          bedrooms: lookup.bedrooms,
          bathrooms: lookup.bathrooms,
          parking: lookup.parking,
          property_type: lookup.propertyType,
          lookup_status: "success",
          raw_property_data: lookup.rawData,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          return {
            address,
            status: "duplicate",
            countAs: "duplicate",
            message: "Already exists in stored properties.",
          };
        }

        throw error;
      }

      if (insertedProperty) {
        try {
          await recomputeMatchesForProperty(supabase, insertedProperty.id);
        } catch {
          return {
            address,
            status: "success",
            countAs: "success",
            message: "Imported, but matches could not be recomputed.",
          };
        }
      }

      return { address, status: "success", countAs: "success" };
    } catch (error) {
      const lookupError = sanitizeError(error);
      const { error: insertError } = await supabase
        .from("properties")
        .insert(
          buildFailedProperty(
            batch.id,
            address,
            normalizedAddress,
            lookupError,
          ),
        );

      if (insertError?.code === "23505") {
        return {
          address,
          status: "duplicate",
          countAs: "duplicate",
          message: "Already exists in stored properties.",
        };
      }

      return {
        address,
        status: "failed",
        countAs: "failed",
        message: insertError
          ? "Lookup failed and the failed address could not be stored."
          : lookupError,
      };
    }
  });
  const successfulCount = results.filter(
    (result) => result.countAs === "success",
  ).length;
  const failedCount = results.filter(
    (result) => result.countAs === "failed",
  ).length;
  const duplicateCount = results.filter(
    (result) => result.countAs === "duplicate",
  ).length;

  const { error: updateError } = await supabase
    .from("import_batches")
    .update({
      successful_count: successfulCount,
      failed_count: failedCount,
      duplicate_count: duplicateCount,
    })
    .eq("id", batch.id);

  if (updateError) {
    return {
      formError:
        "Addresses were processed, but the import batch summary could not be updated.",
      batchId: batch.id,
      totalAddresses: addresses.length,
      successfulCount,
      failedCount,
      duplicateCount,
      results,
    };
  }

  return {
    batchId: batch.id,
    totalAddresses: addresses.length,
    successfulCount,
    failedCount,
    duplicateCount,
    results,
  };
}
