-- Run this in your Supabase SQL Editor to create the required tables

-- Create dmhoa_cases table
CREATE TABLE IF NOT EXISTS dmhoa_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text UNIQUE NOT NULL,
    email text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    unlocked boolean DEFAULT false,
    stripe_checkout_session_id text,
    stripe_payment_intent_id text,
    amount_total integer,
    currency text,
    status text DEFAULT 'preview' CHECK (status IN ('preview', 'pending_payment', 'paid')),
    payload jsonb
);

-- Create dmhoa_events table for audit logging
CREATE TABLE IF NOT EXISTS dmhoa_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    token text,
    type text,
    data jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dmhoa_cases_token ON dmhoa_cases(token);
CREATE INDEX IF NOT EXISTS idx_dmhoa_cases_stripe_session ON dmhoa_cases(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_dmhoa_events_token ON dmhoa_events(token);
CREATE INDEX IF NOT EXISTS idx_dmhoa_events_type ON dmhoa_events(type);

-- Enable Row Level Security
ALTER TABLE dmhoa_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dmhoa_events ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role full access (for Edge Functions)
CREATE POLICY IF NOT EXISTS "Service role can manage dmhoa_cases" ON dmhoa_cases
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can manage dmhoa_events" ON dmhoa_events
    FOR ALL USING (auth.role() = 'service_role');

-- Insert a test case record so the checkout function can find existing cases
-- This creates a case with the token format your system uses
INSERT INTO dmhoa_cases (token, status, payload)
VALUES (
    'case_1766560336042_844IEx',
    'preview',
    '{"noticeType":"violation","role":"owner","outcome":"clarification","propertyType":"condo","state":"CA","issueText":"Test issue for integration"}'::jsonb
) ON CONFLICT (token) DO NOTHING;
