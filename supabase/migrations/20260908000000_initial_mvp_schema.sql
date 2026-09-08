create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  max_budget integer,
  min_bedrooms integer,
  min_bathrooms integer,
  preferred_suburbs text[] not null default '{}',
  property_types text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_max_budget_positive check (
    max_budget is null or max_budget > 0
  ),
  constraint clients_min_bedrooms_non_negative check (
    min_bedrooms is null or min_bedrooms >= 0
  ),
  constraint clients_min_bathrooms_non_negative check (
    min_bathrooms is null or min_bathrooms >= 0
  )
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  total_addresses integer not null,
  successful_count integer not null default 0,
  failed_count integer not null default 0,
  duplicate_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint import_batches_total_addresses_range check (
    total_addresses between 1 and 100
  ),
  constraint import_batches_counts_non_negative check (
    successful_count >= 0
    and failed_count >= 0
    and duplicate_count >= 0
  ),
  constraint import_batches_counts_not_over_total check (
    successful_count + failed_count + duplicate_count <= total_addresses
  )
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.import_batches(id) on delete set null,
  input_address text not null,
  normalized_address text not null,
  address_line text,
  suburb text,
  state text,
  postcode text,
  estimated_price integer,
  bedrooms numeric,
  bathrooms numeric,
  parking numeric,
  property_type text,
  lookup_status text not null,
  lookup_error text,
  raw_property_data jsonb,
  review_status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_normalized_address_unique unique (normalized_address),
  constraint properties_lookup_status_valid check (
    lookup_status in ('pending', 'success', 'failed', 'manual')
  ),
  constraint properties_review_status_valid check (
    review_status in ('new', 'reviewed', 'archived')
  ),
  constraint properties_estimated_price_positive check (
    estimated_price is null or estimated_price > 0
  ),
  constraint properties_bedrooms_non_negative check (
    bedrooms is null or bedrooms >= 0
  ),
  constraint properties_bathrooms_non_negative check (
    bathrooms is null or bathrooms >= 0
  ),
  constraint properties_parking_non_negative check (
    parking is null or parking >= 0
  ),
  constraint properties_state_australian check (
    state is null
    or upper(state) in ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA')
  ),
  constraint properties_postcode_format check (
    postcode is null or postcode ~ '^[0-9]{4}$'
  )
);

comment on column public.properties.import_batch_id is
  'The batch that first created this property. Later duplicate imports are counted on import_batches but are not tracked per address in this MVP.';

create table public.property_client_matches (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  score integer,
  data_completeness integer,
  match_level text not null,
  reasons jsonb not null default '[]'::jsonb,
  hard_constraint_violations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_client_matches_property_client_unique unique (
    property_id,
    client_id
  ),
  constraint property_client_matches_score_range check (
    score is null or score between 0 and 100
  ),
  constraint property_client_matches_data_completeness_range check (
    data_completeness is null or data_completeness between 0 and 100
  ),
  constraint property_client_matches_match_level_valid check (
    match_level in ('strong', 'stretch', 'possible', 'unlikely')
  ),
  constraint property_client_matches_reasons_array check (
    jsonb_typeof(reasons) = 'array'
  ),
  constraint property_client_matches_violations_array check (
    jsonb_typeof(hard_constraint_violations) = 'array'
  )
);

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create trigger property_client_matches_set_updated_at
before update on public.property_client_matches
for each row execute function public.set_updated_at();

create index properties_import_batch_id_idx
  on public.properties(import_batch_id);

create index properties_review_status_created_at_idx
  on public.properties(review_status, created_at desc);

create index properties_lookup_status_idx
  on public.properties(lookup_status);

create index property_client_matches_client_id_idx
  on public.property_client_matches(client_id);

create index property_client_matches_match_level_score_idx
  on public.property_client_matches(match_level, score desc nulls last);

alter table public.clients enable row level security;
alter table public.import_batches enable row level security;
alter table public.properties enable row level security;
alter table public.property_client_matches enable row level security;

comment on table public.clients is
  'RLS is enabled without anon policies. This no-auth MVP should access data through server-side code using the Supabase service role key.';

comment on table public.import_batches is
  'RLS is enabled without anon policies. This no-auth MVP should access data through server-side code using the Supabase service role key.';

comment on table public.properties is
  'RLS is enabled without anon policies. This no-auth MVP should access data through server-side code using the Supabase service role key.';

comment on table public.property_client_matches is
  'RLS is enabled without anon policies. This no-auth MVP should access data through server-side code using the Supabase service role key.';
