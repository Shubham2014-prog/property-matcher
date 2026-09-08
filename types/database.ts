export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          max_budget: number | null;
          min_bedrooms: number | null;
          min_bathrooms: number | null;
          preferred_suburbs: string[];
          property_types: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          max_budget?: number | null;
          min_bedrooms?: number | null;
          min_bathrooms?: number | null;
          preferred_suburbs?: string[];
          property_types?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          max_budget?: number | null;
          min_bedrooms?: number | null;
          min_bathrooms?: number | null;
          preferred_suburbs?: string[];
          property_types?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          total_addresses: number;
          successful_count: number;
          failed_count: number;
          duplicate_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          total_addresses: number;
          successful_count?: number;
          failed_count?: number;
          duplicate_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          total_addresses?: number;
          successful_count?: number;
          failed_count?: number;
          duplicate_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          import_batch_id: string | null;
          input_address: string;
          normalized_address: string;
          address_line: string | null;
          suburb: string | null;
          state: string | null;
          postcode: string | null;
          estimated_price: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          parking: number | null;
          property_type: string | null;
          lookup_status: LookupStatus;
          lookup_error: string | null;
          raw_property_data: Json | null;
          review_status: ReviewStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          import_batch_id?: string | null;
          input_address: string;
          normalized_address: string;
          address_line?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          estimated_price?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          parking?: number | null;
          property_type?: string | null;
          lookup_status: LookupStatus;
          lookup_error?: string | null;
          raw_property_data?: Json | null;
          review_status?: ReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          import_batch_id?: string | null;
          input_address?: string;
          normalized_address?: string;
          address_line?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          estimated_price?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          parking?: number | null;
          property_type?: string | null;
          lookup_status?: LookupStatus;
          lookup_error?: string | null;
          raw_property_data?: Json | null;
          review_status?: ReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      property_client_matches: {
        Row: {
          id: string;
          property_id: string;
          client_id: string;
          score: number | null;
          data_completeness: number | null;
          match_level: MatchLevel;
          reasons: Json;
          hard_constraint_violations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          client_id: string;
          score?: number | null;
          data_completeness?: number | null;
          match_level: MatchLevel;
          reasons?: Json;
          hard_constraint_violations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          client_id?: string;
          score?: number | null;
          data_completeness?: number | null;
          match_level?: MatchLevel;
          reasons?: Json;
          hard_constraint_violations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_client_matches_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_client_matches_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type LookupStatus = "pending" | "success" | "failed" | "manual";
export type ReviewStatus = "new" | "reviewed" | "archived";
export type MatchLevel = "strong" | "stretch" | "possible" | "unlikely";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ImportBatch =
  Database["public"]["Tables"]["import_batches"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyClientMatch =
  Database["public"]["Tables"]["property_client_matches"]["Row"];
