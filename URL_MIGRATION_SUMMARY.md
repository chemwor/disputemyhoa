# Supabase to Heroku URL Migration Summary
## Migration Date
January 4, 2026
## Base URL Changes
### Old Base URL
- `https://yvdwrkhntyutpnklxsvz.supabase.co`
### New Base URL
- `https://dmhoa-246713e0bd92.herokuapp.com`
## Endpoint Mappings
| Old Endpoint | New Endpoint | Notes |
|-------------|--------------|-------|
| `/functions/v1/create-checkout-session` | `/api/create-checkout-session` | Same name |
| `/functions/v1/create-message` | `/api/store-message` | **Name changed** |
| `/functions/v1/send-message` | `/api/send-message` | Same name |
| `/functions/v1/read-messages` | `/api/read-messages` | Same name |
| `/functions/v1/doc-extract-start` | `/api/doc-extract-start` | Same name |
| `/functions/v1/save-case` | `/api/save-case` | Same name |
| `/functions/v1/read-case` | `/api/case-data` | **Name changed** |
| `/functions/v1/generate-case-outputs` | `/api/case-analysis` | **Name changed** |
| `/functions/v1/read-outputs` | `/api/read-outputs` | Same name |
### Webhook URL
| Old Endpoint | New Endpoint | Notes |
|-------------|--------------|-------|
| `/functions/v1/stripe-webhook` | `/webhooks/stripe` | **Different prefix** (/webhooks/ not /api/) |
## Files Modified
### 1. `/src/components/pages/case/case-workspace.### 1- Updated base URL: `getSupabaseUrl()` returns Heroku URL
- Updated endpoints:
  - `read-case` → `case-data`
  - `read-outputs` → `read-outputs`
  - `generate-case-outputs` → `case-analysis`
  - `read-messages` → `read-messages`
  - `create-message` → `store-message`
  - `send-message` → `send-message`
### 2. `/src/components/pages/case-preview/preview.htm`
- Updated base URL: `getSupabaseUrl()` returns Heroku URL (2 instances)
- Updated endpoints:
  - `read-case` → `case-data` (hardcoded URL)
  - `create-checkout-session` → `create-checkout-session` (2 instances)
### 3. `/src/components/pages/start-case/wizard.htm`
- Updated base URL: `this.supabaseUrl` property
- Updated endpoints:
  - `doc-extract-start` → `doc-extract-start` (2 instances)  - `doc-extract-start` → `doc-extinstances)
## Verification
All Supabase Edge Function URLs have been successfully migrated to Heroku backend URLs.
No compile errors introduced by the migration.
## Notes
- The anon key remains the same (backward compatibility)
- All fetch() calls maintain the same headers and request structure
- Storage URLs (if any) remain unchanged as they use `/storage/v1/` paths
