# Property Matcher

A buyer's agent receives batches of property addresses and needs to quickly understand which properties best suit existing clients. This MVP helps Neil import new opportunities, enrich them with property data, and review explainable client matches from a property-first workflow.

## What I Built

- Client criteria management for budget, bedroom/bathroom requirements, preferred suburbs, property types, and notes.
- Batch import for up to 100 complete Australian property addresses.
- HtAG-backed property enrichment behind a provider abstraction.
- Supabase/Postgres persistence for clients, import batches, properties, and property-client matches.
- Deterministic explainable matching with separate score and data-completeness values.
- Property-first opportunity dashboard for recent imported properties and their useful client matches.
- Strong, Stretch, Possible, and Unlikely match classifications.

## Product Decisions

1. Address input rather than listing scraping

   The initial problem was clarified with the client. Neil receives complete addresses, so scraping realestate.com.au, Domain, or arbitrary listing pages was intentionally avoided.

2. Property-first workflow

   Neil already understands his clients well. His priority is reviewing new properties and the client matches those properties create, so the dashboard and properties page are property-first.

3. Deterministic matching

   Budget, bedrooms, bathrooms, suburb, and property type are structured criteria. A deterministic model is faster, cheaper, easier to test, and easier for Neil to understand than an LLM-based matcher.

4. Stretch matches

   Hard numerical requirements normally matter, but Neil still wants to review unusually strong properties with mild hard-rule violations. Stretch matches expose those cases instead of silently filtering them out.

5. Missing data

   Missing property data is uncertainty, not evidence of fit. The match score and data completeness are stored separately so incomplete records do not receive free points.

## Matching Model

Weights:

- Budget: 35
- Bedrooms: 25
- Bathrooms: 10
- Preferred suburb: 20
- Property type: 10

Only criteria configured for a client are included in that client's scoring denominator. Known matching criteria earn their weighted points. Unknown property values earn no points and reduce data completeness.

Levels:

- Strong: score is at least 80, data completeness is at least 70, and there are no known hard-rule violations.
- Stretch: exactly one non-severe hard-rule violation, score is at least 60, supporting non-violated criteria score at least 85, and data completeness is at least 70.
- Possible: partial alignment, or incomplete data with enough positive signal to review.
- Unlikely: weak alignment, severe hard-rule violations, or insufficient supporting evidence.

Budget violations are mild up to 10% over budget, moderate up to 20%, and severe above 20%. Bedroom and bathroom shortfalls of one are mild; larger shortfalls are severe.

## Architecture

Next.js App Router provides the UI, server-rendered pages, and server actions.

The main flow is:

```text
Next.js UI
-> server actions/services
-> PropertyDataProvider
-> HtAG property provider
-> Supabase/Postgres
-> deterministic matching service
-> property-first dashboard/review pages
```

Property lookup is decoupled through `PropertyDataProvider`, so the rest of the app depends on a normalized property result rather than HtAG response shapes.

Matching is implemented as pure TypeScript business logic in `lib/matching/scoring.ts`. Match recomputation and persistence live in the server-only matching service and write to `property_client_matches`.

## Database

- `clients`: buyer profiles and structured criteria.
- `import_batches`: one pasted batch of addresses and its success/failure/duplicate counts.
- `properties`: normalized property records, lookup status, review status, and preserved raw provider data for debugging.
- `property_client_matches`: persisted deterministic match results for each property/client pair.

The prototype keeps repeated-property history simple: `properties.normalized_address` is unique, and repeated imports count as duplicates instead of creating additional property rows.

## Running Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set these variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
HTAG_API_KEY
```

Do not commit real environment values.

Apply the database migration in `supabase/migrations/20260908000000_initial_mvp_schema.sql` to your Supabase project. For demo data, apply `supabase/seed.sql` after the migration. If using the Supabase CLI with a linked project, `supabase db push` is appropriate for the migration; otherwise run the SQL files from the Supabase SQL editor.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000. If that port is already in use, Next.js will print the alternate local URL.

Verification commands:

```bash
npm run test:matching
npm run lint
npm run build
```

## Assumptions / Limitations

- HtAG may return incomplete property attributes for valid addresses.
- Fuzzy address resolution needs confidence checks or manual confirmation before production use.
- Suburb preference currently uses exact suburb matching rather than geographic proximity.
- Synchronous small-concurrency imports are suitable for this prototype.
- Production batch processing should use queues, retries, rate limiting, and progress tracking.
- Authentication is intentionally omitted because this is a single-user prototype.
- Production would require authentication and tenant/user-scoped RLS policies.
- Repeated-property import history is intentionally simplified by normalized-address uniqueness.

## What I Would Do Next

- Add address-confidence confirmation before storing enriched properties.
- Add geospatial proximity for nearby-suburb scoring.
- Move imports to background jobs with retries and rate limiting.
- Add authentication, tenant/user ownership, and scoped RLS.
- Add monitoring and operational visibility for lookup failures.
- Optionally use an LLM for unstructured client notes while keeping structured matching deterministic.
