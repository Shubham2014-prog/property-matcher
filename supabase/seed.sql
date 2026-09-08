insert into public.clients (
  name,
  email,
  phone,
  max_budget,
  min_bedrooms,
  min_bathrooms,
  preferred_suburbs,
  property_types,
  notes
) values
  (
    'Amelia Hart',
    'amelia.hart@example.test',
    '0400 111 222',
    950000,
    3,
    2,
    array['Tweed Heads South', 'Banora Point'],
    array['house', 'townhouse'],
    'Fictional demo buyer looking for a family home near schools.'
  ),
  (
    'Marcus Lee',
    'marcus.lee@example.test',
    '0400 222 333',
    720000,
    2,
    1,
    array['Coolangatta', 'Kirra'],
    array['apartment', 'unit'],
    'Fictional demo buyer prioritising low-maintenance coastal properties.'
  ),
  (
    'Priya Nair',
    'priya.nair@example.test',
    '0400 333 444',
    1250000,
    4,
    2,
    array['Palm Beach', 'Elanora'],
    array['house'],
    'Fictional demo buyer open to a slight budget stretch for the right family property.'
  ),
  (
    'Samir and Elena Costa',
    'costa.family@example.test',
    '0400 444 555',
    850000,
    3,
    2,
    array['Robina', 'Varsity Lakes'],
    array['townhouse', 'house'],
    'Fictional demo buyers wanting practical access to work and schools.'
  );

with inserted_batch as (
  insert into public.import_batches (
    total_addresses,
    successful_count,
    failed_count,
    duplicate_count
  ) values
    (6, 5, 1, 0)
  returning id
)
insert into public.properties (
  import_batch_id,
  input_address,
  normalized_address,
  address_line,
  suburb,
  state,
  postcode,
  estimated_price,
  bedrooms,
  bathrooms,
  parking,
  property_type,
  lookup_status,
  lookup_error,
  raw_property_data,
  review_status
)
select
  inserted_batch.id,
  property.input_address,
  property.normalized_address,
  property.address_line,
  property.suburb,
  property.state,
  property.postcode,
  property.estimated_price,
  property.bedrooms,
  property.bathrooms,
  property.parking,
  property.property_type,
  property.lookup_status,
  property.lookup_error,
  property.raw_property_data,
  property.review_status
from inserted_batch
cross join (
  values
    (
      '1 Floral Avenue Tweed Heads South, NSW 2486',
      '1 floral avenue tweed heads south nsw 2486',
      '1 Floral Avenue',
      'Tweed Heads South',
      'NSW',
      '2486',
      910000,
      3,
      2,
      2,
      'house',
      'success',
      null,
      '{"demo": true, "provider": "seed"}'::jsonb,
      'new'
    ),
    (
      '18 Coral Street Coolangatta, QLD 4225',
      '18 coral street coolangatta qld 4225',
      '18 Coral Street',
      'Coolangatta',
      'QLD',
      '4225',
      690000,
      2,
      1,
      1,
      'apartment',
      'success',
      null,
      '{"demo": true, "provider": "seed"}'::jsonb,
      'new'
    ),
    (
      '42 Melaleuca Drive Palm Beach, QLD 4221',
      '42 melaleuca drive palm beach qld 4221',
      '42 Melaleuca Drive',
      'Palm Beach',
      'QLD',
      '4221',
      1325000,
      4,
      2,
      2,
      'house',
      'success',
      null,
      '{"demo": true, "provider": "seed"}'::jsonb,
      'new'
    ),
    (
      '7 Station Lane Varsity Lakes, QLD 4227',
      '7 station lane varsity lakes qld 4227',
      '7 Station Lane',
      'Varsity Lakes',
      'QLD',
      '4227',
      825000,
      3,
      2,
      1,
      'townhouse',
      'success',
      null,
      '{"demo": true, "provider": "seed"}'::jsonb,
      'new'
    ),
    (
      '93 Jacaranda Crescent Elanora, QLD 4221',
      '93 jacaranda crescent elanora qld 4221',
      '93 Jacaranda Crescent',
      'Elanora',
      'QLD',
      '4221',
      null,
      4,
      null,
      2,
      'house',
      'success',
      null,
      '{"demo": true, "provider": "seed", "price_available": false}'::jsonb,
      'new'
    ),
    (
      '12 Harbour View Road Darwin City, NT 0800',
      '12 harbour view road darwin city nt 0800',
      '12 Harbour View Road',
      'Darwin City',
      'NT',
      '0800',
      null,
      null,
      null,
      null,
      null,
      'failed',
      'Demo lookup failure: fictional provider could not resolve the address.',
      '{"demo": true, "provider": "seed"}'::jsonb,
      'new'
    )
) as property (
  input_address,
  normalized_address,
  address_line,
  suburb,
  state,
  postcode,
  estimated_price,
  bedrooms,
  bathrooms,
  parking,
  property_type,
  lookup_status,
  lookup_error,
  raw_property_data,
  review_status
)
;
