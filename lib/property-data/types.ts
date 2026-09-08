import type { Json } from "@/types/database";

export type PropertyLookupResult = {
  displayAddress: string | null;
  addressLine: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  estimatedPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  propertyType: string | null;
  rawData: Json;
};

export interface PropertyDataProvider {
  lookup(address: string): Promise<PropertyLookupResult>;
}
