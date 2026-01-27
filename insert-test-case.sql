-- Quick test to insert a case record for your current test token
-- Run this in Supabase SQL Editor to ensure your test case exists

INSERT INTO dmhoa_cases (token, status, payload, created_at)
VALUES (
    'case_1766560336042_844IEx',
    'preview',
    '{"noticeType":"violation","role":"owner","outcome":"clarification","propertyType":"condo","state":"CA","issueText":"Test issue for integration"}'::jsonb,
    now()
)
ON CONFLICT (token)
DO UPDATE SET
    status = 'preview',
    payload = '{"noticeType":"violation","role":"owner","outcome":"clarification","propertyType":"condo","state":"CA","issueText":"Test issue for integration"}'::jsonb,
    updated_at = now();

-- Check if the record was inserted
SELECT token, status, email, created_at FROM dmhoa_cases WHERE token = 'case_1766560336042_844IEx';
