ALTER TABLE public.transit_ops_region
  ADD COLUMN IF NOT EXISTS code VARCHAR(2),
  ADD COLUMN IF NOT EXISTS region_type VARCHAR(32);

INSERT INTO public.transit_ops_region (name, code, region_type, active)
VALUES
  ('Andhra Pradesh', 'AP', 'State', true),
  ('Arunachal Pradesh', 'AR', 'State', true),
  ('Assam', 'AS', 'State', true),
  ('Bihar', 'BR', 'State', true),
  ('Chhattisgarh', 'CG', 'State', true),
  ('Goa', 'GA', 'State', true),
  ('Gujarat', 'GJ', 'State', true),
  ('Haryana', 'HR', 'State', true),
  ('Himachal Pradesh', 'HP', 'State', true),
  ('Jharkhand', 'JH', 'State', true),
  ('Karnataka', 'KA', 'State', true),
  ('Kerala', 'KL', 'State', true),
  ('Madhya Pradesh', 'MP', 'State', true),
  ('Maharashtra', 'MH', 'State', true),
  ('Manipur', 'MN', 'State', true),
  ('Meghalaya', 'ML', 'State', true),
  ('Mizoram', 'MZ', 'State', true),
  ('Nagaland', 'NL', 'State', true),
  ('Odisha', 'OD', 'State', true),
  ('Punjab', 'PB', 'State', true),
  ('Rajasthan', 'RJ', 'State', true),
  ('Sikkim', 'SK', 'State', true),
  ('Tamil Nadu', 'TN', 'State', true),
  ('Telangana', 'TS', 'State', true),
  ('Tripura', 'TR', 'State', true),
  ('Uttar Pradesh', 'UP', 'State', true),
  ('Uttarakhand', 'UK', 'State', true),
  ('West Bengal', 'WB', 'State', true),
  ('Andaman and Nicobar Islands', 'AN', 'Union Territory', true),
  ('Chandigarh', 'CH', 'Union Territory', true),
  ('Dadra and Nagar Haveli and Daman and Diu', 'DN', 'Union Territory', true),
  ('Delhi', 'DL', 'Union Territory', true),
  ('Jammu and Kashmir', 'JK', 'Union Territory', true),
  ('Ladakh', 'LA', 'Union Territory', true),
  ('Lakshadweep', 'LD', 'Union Territory', true),
  ('Puducherry', 'PY', 'Union Territory', true)
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  region_type = EXCLUDED.region_type,
  active = true,
  updated_at = CURRENT_TIMESTAMP;

DELETE FROM public.transit_ops_region WHERE name = 'All Over India';

ALTER TABLE public.transit_ops_region
  DROP CONSTRAINT IF EXISTS transit_ops_region_region_type_check;
ALTER TABLE public.transit_ops_region
  ADD CONSTRAINT transit_ops_region_region_type_check
  CHECK (region_type IN ('State', 'Union Territory'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_transit_ops_region_code
  ON public.transit_ops_region (code)
  WHERE code IS NOT NULL;
