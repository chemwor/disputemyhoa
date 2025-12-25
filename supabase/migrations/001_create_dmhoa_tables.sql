-- Create dmhoa_cases table
CREATE TABLE dmhoa_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text UNIQUE NOT NULL,
    email text,
    created_at timestamptz DEFAULT now(),
    unlocked boolean DEFAULT false,
    stripe_checkout_session_id text,
    stripe_payment_intent_id text,
    amount_total integer,
    currency text,
    status text DEFAULT 'preview' CHECK (status IN ('preview', 'pending_payment', 'paid')),
    payload jsonb
);

-- Create dmhoa_events table for audit logging
CREATE TABLE dmhoa_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    token text,
    type text,
    data jsonb
);

-- Create indexes
CREATE INDEX idx_dmhoa_cases_token ON dmhoa_cases(token);
CREATE INDEX idx_dmhoa_cases_stripe_session ON dmhoa_cases(stripe_checkout_session_id);
CREATE INDEX idx_dmhoa_events_token ON dmhoa_events(token);
CREATE INDEX idx_dmhoa_events_type ON dmhoa_events(type);

-- Row Level Security (RLS) - Enable but create policy for read-case function
ALTER TABLE dmhoa_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dmhoa_events ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role full access (for Edge Functions)
CREATE POLICY "Service role can manage dmhoa_cases" ON dmhoa_cases
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage dmhoa_events" ON dmhoa_events
    FOR ALL USING (auth.role() = 'service_role');
