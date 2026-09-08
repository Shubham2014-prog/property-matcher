"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recomputeMatchesForClient } from "@/lib/matching";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ClientFormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
};

const propertyTypes = ["house", "townhouse", "apartment", "unit"] as const;

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function parseOptionalInteger(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
) {
  const raw = getString(formData, key).replace(/[$,\s]/g, "");

  if (raw.length === 0) {
    return null;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    errors[key] = `${label} must be a whole number.`;
    return null;
  }

  if (key === "max_budget" && value === 0) {
    errors[key] = `${label} must be greater than zero.`;
    return null;
  }

  return value;
}

function parsePreferredSuburbs(formData: FormData) {
  const raw = getString(formData, "preferred_suburbs");
  const seen = new Set<string>();

  return raw
    .split(",")
    .map((suburb) => suburb.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((suburb) => {
      const key = suburb.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function parsePropertyTypes(formData: FormData) {
  const selected = formData
    .getAll("property_types")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return propertyTypes.filter((type) => selected.includes(type));
}

function validateClientForm(formData: FormData) {
  const fieldErrors: Record<string, string> = {};
  const name = getString(formData, "name");
  const email = getOptionalString(formData, "email")?.toLowerCase() ?? null;
  const phone = getOptionalString(formData, "phone");
  const notes = getOptionalString(formData, "notes");
  const maxBudget = parseOptionalInteger(
    formData,
    "max_budget",
    "Maximum budget",
    fieldErrors,
  );
  const minBedrooms = parseOptionalInteger(
    formData,
    "min_bedrooms",
    "Minimum bedrooms",
    fieldErrors,
  );
  const minBathrooms = parseOptionalInteger(
    formData,
    "min_bathrooms",
    "Minimum bathrooms",
    fieldErrors,
  );

  if (!name) {
    fieldErrors.name = "Name is required.";
  }

  if (name.length > 120) {
    fieldErrors.name = "Name must be 120 characters or fewer.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (email && email.length > 254) {
    fieldErrors.email = "Email must be 254 characters or fewer.";
  }

  if (phone && phone.length > 40) {
    fieldErrors.phone = "Phone must be 40 characters or fewer.";
  }

  if (notes && notes.length > 2000) {
    fieldErrors.notes = "Notes must be 2000 characters or fewer.";
  }

  const client: ClientInsert = {
    name,
    email,
    phone,
    max_budget: maxBudget,
    min_bedrooms: minBedrooms,
    min_bathrooms: minBathrooms,
    preferred_suburbs: parsePreferredSuburbs(formData),
    property_types: parsePropertyTypes(formData),
    notes,
  };

  return {
    client,
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export async function createClientAction(
  _previousState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { client, fieldErrors, isValid } = validateClientForm(formData);

  if (!isValid) {
    return { fieldErrors };
  }

  const supabase = createServerSupabaseClient();
  const { data: insertedClient, error } = await supabase
    .from("clients")
    .insert(client)
    .select("id")
    .single();

  if (error || !insertedClient) {
    return {
      formError: "Client could not be created. Check the submitted details.",
    };
  }

  try {
    await recomputeMatchesForClient(supabase, insertedClient.id);
  } catch {
    revalidatePath("/clients");
    return {
      formError: "Client was saved, but matches could not be recomputed.",
    };
  }

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientAction(
  clientId: string,
  _previousState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { client, fieldErrors, isValid } = validateClientForm(formData);

  if (!isValid) {
    return { fieldErrors };
  }

  const update: ClientUpdate = client;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update(update)
    .eq("id", clientId);

  if (error) {
    return {
      formError: "Client could not be updated. Check the submitted details.",
    };
  }

  try {
    await recomputeMatchesForClient(supabase, clientId);
  } catch {
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}/edit`);
    return {
      formError: "Client was saved, but matches could not be recomputed.",
    };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}/edit`);
  redirect("/clients");
}
