CREATE TABLE IF NOT EXISTS public.transit_ops_settings (
  id TEXT PRIMARY KEY CHECK (id = 'global'),
  distance_unit TEXT NOT NULL DEFAULT 'km' CHECK (distance_unit = 'km'),
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'tonne')),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  notifications JSONB NOT NULL DEFAULT '{"pushAlerts":true,"emailSummaries":false,"smsDispatch":true,"slackSync":false}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transit_ops_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.transit_ops_settings FROM anon, authenticated;
GRANT ALL ON TABLE public.transit_ops_settings TO service_role;

INSERT INTO public.transit_ops_settings (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;
