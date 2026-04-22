-- Insert test fine data into dmhoa_case_outputs table
-- Run this after running the migration 002_create_case_outputs_table.sql

-- First, get the case_id for your test case
-- Replace 'YOUR_TEST_CASE_TOKEN' with an actual token from your dmhoa_cases table

-- Example: Insert fine data for a test case
-- This will show fines accruing at $25/day starting 30 days ago
INSERT INTO dmhoa_case_outputs (
    case_token,
    case_id,
    status,
    fine_per_day,
    fine_start_date,
    outputs,
    model,
    prompt_version,
    created_at,
    updated_at
)
SELECT
    token as case_token,
    id as case_id,
    'ready' as status,
    25.00 as fine_per_day,                           -- $25 per day
    (CURRENT_DATE - INTERVAL '30 days') as fine_start_date,  -- Started 30 days ago
    '{"letter_summary": "Test case with fine data", "drafts": {"clarification": "Test draft", "extension": "Test draft", "compliance": "Test draft"}, "action_plan": ["Review notice", "Respond promptly"]}'::jsonb as outputs,
    'gpt-4o-mini' as model,
    'v4_test' as prompt_version,
    NOW() as created_at,
    NOW() as updated_at
FROM dmhoa_cases
WHERE status = 'paid' OR unlocked = true
LIMIT 1
ON CONFLICT (case_token) DO UPDATE SET
    fine_per_day = EXCLUDED.fine_per_day,
    fine_start_date = EXCLUDED.fine_start_date,
    status = 'ready',
    updated_at = NOW();

-- Or insert for a specific token:
-- INSERT INTO dmhoa_case_outputs (case_token, case_id, status, fine_per_day, fine_start_date, outputs)
-- VALUES (
--     'case_YOUR_TOKEN_HERE',
--     (SELECT id FROM dmhoa_cases WHERE token = 'case_YOUR_TOKEN_HERE'),
--     'ready',
--     25.00,
--     '2025-01-01',
--     '{"letter_summary": "Test", "drafts": {}}'::jsonb
-- )
-- ON CONFLICT (case_token) DO UPDATE SET
--     fine_per_day = 25.00,
--     fine_start_date = '2025-01-01',
--     status = 'ready';

-- Verify the data
SELECT
    c.token,
    c.status as case_status,
    c.unlocked,
    o.fine_per_day,
    o.fine_start_date,
    o.status as outputs_status,
    CURRENT_DATE - o.fine_start_date as days_elapsed,
    (CURRENT_DATE - o.fine_start_date) * o.fine_per_day as total_accrued
FROM dmhoa_cases c
LEFT JOIN dmhoa_case_outputs o ON c.token = o.case_token
WHERE o.fine_per_day IS NOT NULL;
