# Stripe + Supabase Integration - Deployment Guide

## Overview
This integration replaces the simulated checkout with real Stripe-hosted Checkout backed by Supabase Edge Functions and database.

## Setup Steps

### 1. Supabase Setup

#### A. Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL: `https://YOUR-PROJECT-ID.supabase.co`
3. Get your service role key from Settings > API

#### B. Database Setup
1. Run the SQL migration in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of supabase/migrations/001_create_dmhoa_tables.sql
   ```

#### C. Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR-PROJECT-ID

# Deploy all functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook  
supabase functions deploy read-case
```

#### D. Set Environment Variables in Supabase
Go to Settings > Edge Functions and add:
- `STRIPE_SECRET_KEY`: Your Stripe secret key (sk_test_... or sk_live_...)
- `STRIPE_PRICE_ID`: Your Stripe price ID (price_...)
- `STRIPE_WEBHOOK_SECRET`: Webhook endpoint secret from Stripe dashboard
- `SITE_URL`: Your Netlify site URL (https://yoursite.netlify.app)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

### 2. Stripe Setup

#### A. Create Product and Price
1. In Stripe Dashboard, create a product for "Case Pass - $29"
2. Create a price for $29.00 USD
3. Copy the price ID (starts with `price_`)

#### B. Set up Webhook
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://YOUR-PROJECT-ID.supabase.co/functions/v1/stripe-webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret (starts with `whsec_`)

### 3. Frontend Configuration

Update the Supabase URLs in the frontend files:
- Replace `YOUR_SUPABASE_PROJECT` with your actual project ID in:
  - `src/components/pages/case-preview/preview.htm`
  - `src/components/pages/case/case-workspace.htm`

### 4. Deploy to Netlify

Your static site will deploy normally to Netlify. The Edge Functions run on Supabase infrastructure.

## Testing

### Test Mode (Recommended First)
1. Use Stripe test keys (sk_test_...)
2. Use test card: 4242 4242 4242 4242
3. Monitor Supabase logs and Stripe dashboard

### Production Checklist
- [ ] Replace test Stripe keys with live keys
- [ ] Update webhook endpoint to use live mode
- [ ] Test complete purchase flow
- [ ] Verify case unlocking works
- [ ] Monitor error logs

## Architecture

```
User -> Netlify (Static Site) 
     -> Supabase Edge Functions
     -> Stripe Checkout (hosted)
     -> Stripe Webhook -> Supabase DB
     -> User gets unlocked case
```

## Security Notes

- Frontend never sees Stripe secret keys
- Webhook signature verification prevents spoofing
- RLS policies protect database access
- Case unlock only happens via verified webhook

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Edge Functions include proper CORS headers
2. **Webhook Not Working**: Check webhook URL and signing secret
3. **Case Not Unlocking**: Verify webhook receives `checkout.session.completed` events
4. **Database Access**: Ensure service role key has proper permissions

### Monitoring

- Supabase Dashboard > Edge Functions for function logs
- Stripe Dashboard > Webhooks for webhook delivery status
- Supabase Dashboard > Database for case records

## Cost Considerations

- Supabase: Free tier includes 500K Edge Function invocations/month
- Stripe: 2.9% + 30¢ per successful transaction
- Netlify: Free tier for static hosting
