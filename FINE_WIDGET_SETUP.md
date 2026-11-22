# Fine Accrual Calculator Widget Setup

## Overview
The fine accrual calculator widget displays estimated fines accrued based on `fine_per_day` and `fine_start_date` from the `dmhoa_case_outputs` table.

## Current Status
- **Frontend**: Complete and ready
- **Database**: Table has `fine_per_day` and `fine_start_date` columns
- **Backend**: `/api/read-outputs` needs to return these fields

## Testing the Frontend

### Debug Mode
Add `?debug_fine=1` to your case URL to test with sample data:
```
https://yoursite.com/case-workspace.html?case=YOUR_TOKEN&debug_fine=1
```
This will show the widget with test data ($100/day × 30 days = $3,000).

If the widget appears in debug mode but not normally, the issue is the backend.

### Browser Console
Open browser DevTools (F12) and check the Console tab for:
- `[Fine Widget] Checking data sources:` - Shows what data is available
- `[Outputs API] Full response:` - Shows what the API returns
- `[Outputs API] fine_per_day:` - Should show `100` (or your value)
- `[Outputs API] fine_start_date:` - Should show `2025-12-27` (or your value)

## Backend Fix Required

Your Heroku backend's `/api/read-outputs` endpoint must SELECT and return `fine_per_day` and `fine_start_date`.

### Current Issue
The API is likely only returning:
```json
{
  "status": "ready",
  "outputs": {...}
}
```

### Required Response Format
```json
{
  "status": "ready",
  "outputs": {...},
  "fine_per_day": 100,
  "fine_start_date": "2025-12-27"
}
```

### SQL Query Update
In your Heroku Flask app, update the `/api/read-outputs` endpoint's SQL query from:
```sql
SELECT outputs, status FROM dmhoa_case_outputs WHERE case_token = %s
```

To:
```sql
SELECT outputs, status, fine_per_day, fine_start_date
FROM dmhoa_case_outputs
WHERE case_token = %s
```

### Flask Code Update
In your Heroku Flask app, update the response to include:
```python
response_data = {
    'status': result['status'],
    'outputs': json.loads(result['outputs']) if result['outputs'] else None,
    'fine_per_day': float(result['fine_per_day']) if result['fine_per_day'] is not None else None,
    'fine_start_date': str(result['fine_start_date']) if result['fine_start_date'] is not None else None,
}
```

## Data in Database

Your test record has:
- `case_token`: `case_1771816641654_efjiQs`
- `fine_per_day`: `100`
- `fine_start_date`: `2025-12-27`

## Widget Display

When working correctly, the widget shows:

```
⚠️ Estimated fines accrued: $5,900 (59 days × $100/day)
   Fines estimated from December 27, 2025 based on your violation notice.
   Actual amounts depend on whether your HOA has formally assessed them.
```

## Files Modified

1. `src/components/pages/case/case-workspace.htm` - Added widget HTML and JS
2. `heroku-flask-routes.py` - Template showing required API response format
3. `CASE_WORKSPACE_DATATYPE_MAPPING.md` - Updated API response interface

## Verification Steps

1. Open your case page with `?debug_fine=1` - widget should appear
2. Open browser console and load page normally - check API response
3. Update Heroku backend to return `fine_per_day` and `fine_start_date`
4. Redeploy Heroku app
5. Load page normally - widget should appear with real data
