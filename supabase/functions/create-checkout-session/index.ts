// // Setup type definitions for built-in Supabase Runtime APIs
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import Stripe from 'https://esm.sh/stripe@14.21.0'
//
// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'POST, OPTIONS',
// }
//
// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders })
//   }
//
//   try {
//     // Environment variables
//     const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
//     const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')
//     const SITE_URL = Deno.env.get('SITE_URL')
//     const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
//     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
//
//     if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !SITE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
//       throw new Error('Missing required environment variables')
//     }
//
//     // Initialize Stripe and Supabase
//     const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
//     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
//
//     // Parse request body
//     const { token, email, payload } = await req.json()
//
//     if (!token || !email) {
//       return new Response(
//         JSON.stringify({ error: 'Token and email are required' }),
//         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }
//
//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//     if (!emailRegex.test(email)) {
//       return new Response(
//         JSON.stringify({ error: 'Invalid email format' }),
//         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }
//
//     // Check if case exists
//     const { data: existingCase, error: fetchError } = await supabase
//       .from('dmhoa_cases')
//       .select('id, token, status')
//       .eq('token', token)
//       .single()
//
//     if (fetchError && fetchError.code !== 'PGRST116') {
//       console.error('Database fetch error:', fetchError)
//       throw new Error('Database error')
//     }
//
//     if (!existingCase) {
//       return new Response(
//         JSON.stringify({ error: 'Case not found. Please start a new case.' }),
//         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }
//
//     // Update case with email and pending status
//     const { error: updateError } = await supabase
//       .from('dmhoa_cases')
//       .update({
//         email: email,
//         status: 'pending_payment',
//         updated_at: new Date().toISOString()
//       })
//       .eq('token', token)
//
//     if (updateError) {
//       console.error('Database update error:', updateError)
//       throw new Error('Failed to update case')
//     }
//
//     // Create Stripe Checkout Session
//     const session = await stripe.checkout.sessions.create({
//       mode: 'payment',
//       line_items: [
//         {
//           price: STRIPE_PRICE_ID,
//           quantity: 1,
//         },
//       ],
//       success_url: `${SITE_URL}/case.html?case=${encodeURIComponent(token)}&session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${SITE_URL}/case-preview.html?case=${encodeURIComponent(token)}`,
//       client_reference_id: token,
//       customer_email: email,
//       metadata: {
//         token: token,
//         source: 'dispute-my-hoa'
//       },
//       expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
//     })
//
//     // Log event
//     await supabase
//       .from('dmhoa_events')
//       .insert({
//         token: token,
//         type: 'checkout_session_created',
//         data: {
//           session_id: session.id,
//           email: email,
//           amount: session.amount_total,
//           currency: session.currency
//         }
//       })
//
//     return new Response(
//       JSON.stringify({ url: session.url }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     )
//
//   } catch (error) {
//     console.error('Create checkout session error:', error)
//     return new Response(
//       JSON.stringify({ error: error.message || 'Internal server error' }),
//       {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     )
//   }
// })


// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper: safely preview env values without leaking secrets
function previewEnv(name: string, value: string | undefined) {
  if (!value) return { name, present: false, preview: null, length: 0 }
  const lower = name.toLowerCase()
  const isSecret =
    lower.includes('secret') ||
    lower.includes('service_role') ||
    lower.includes('key')

  const preview = isSecret
    ? `${value.slice(0, 6)}…(${value.length})`
    : `${value.slice(0, 24)}${value.length > 24 ? '…' : ''}`

  return { name, present: true, preview, length: value.length }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[create-checkout-session] request', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.get('authorization'),
    hasApiKeyHeader: !!req.headers.get('apikey'),
    origin: req.headers.get('origin'),
  })

  try {
    // Environment variables
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')
    const SITE_URL = Deno.env.get('SITE_URL')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const envReport = [
      previewEnv('STRIPE_SECRET_KEY', STRIPE_SECRET_KEY),
      previewEnv('STRIPE_PRICE_ID', STRIPE_PRICE_ID),
      previewEnv('SITE_URL', SITE_URL),
      previewEnv('SUPABASE_URL', SUPABASE_URL),
      previewEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
    ]
    console.log('[create-checkout-session] env report', envReport)

    const missing = envReport.filter(v => !v.present).map(v => v.name)
    if (missing.length > 0) {
      console.error('[create-checkout-session] missing env vars', missing)
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables', missing }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-checkout-session] initializing clients')
    const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Parse request body
    const body = await req.json().catch(() => ({} as any))
    const { token, email, payload } = body || {}

    console.log('[create-checkout-session] parsed body', {
      hasToken: !!token,
      tokenPreview: typeof token === 'string' ? `${token.slice(0, 12)}…` : null,
      hasEmail: !!email,
      emailDomain: typeof email === 'string' && email.includes('@') ? email.split('@')[1] : null,
      hasPayload: !!payload,
    })

    if (!token || !email) {
      return new Response(
        JSON.stringify({ error: 'Token and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1) Fetch case (it may not exist yet — that's OK)
    console.log('[create-checkout-session] fetching case', { tokenPreview: `${token.slice(0, 12)}…` })
    const { data: existingCase, error: fetchError } = await supabase
      .from('dmhoa_cases')
      .select('id, token, status, stripe_checkout_session_id')
      .eq('token', token)
      .maybeSingle()

    if (fetchError) {
      console.error('[create-checkout-session] database fetch error', {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
      })
      throw new Error('Database error')
    }

    // 2) Create case if missing (this is your chosen MVP behavior)
    if (!existingCase) {
      console.warn('[create-checkout-session] case not found, creating new case', { tokenPreview: `${token.slice(0, 12)}…` })

      const { error: insertError } = await supabase
        .from('dmhoa_cases')
        .insert({
          token,
          email,
          status: 'pending_payment',
          unlocked: false,
          payload: payload ?? null,
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('[create-checkout-session] failed to create case', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        })
        throw new Error('Failed to create case')
      }
    } else {
      console.log('[create-checkout-session] case found', {
        status: existingCase.status,
        hasExistingSession: !!existingCase.stripe_checkout_session_id
      })

      // If case exists, update it (email/payload/status)
      console.log('[create-checkout-session] updating case status -> pending_payment')
      const { error: updateError } = await supabase
        .from('dmhoa_cases')
        .update({
          email,
          payload,                // ✅ add this
          status: 'pending_payment',
          updated_at: new Date().toISOString()
        })
        .eq('token', token)


      if (updateError) {
        console.error('[create-checkout-session] database update error', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        })
        throw new Error('Failed to update case')
      }
    }

    // 3) Create Stripe Checkout Session
    console.log('[create-checkout-session] creating stripe checkout session', {
      priceId: STRIPE_PRICE_ID,
      siteUrl: SITE_URL,
      expiresInMinutes: 30,
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${SITE_URL}/case.html?case=${encodeURIComponent(token)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/case-preview.html?case=${encodeURIComponent(token)}`,
      client_reference_id: token,
      customer_email: email,
      metadata: { token, source: 'dispute-my-hoa' },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    })

    console.log('[create-checkout-session] stripe session created', {
      sessionId: session.id,
      hasUrl: !!session.url,
      amountTotal: session.amount_total,
      currency: session.currency,
    })

    // 4) Save session id on the case (so you can reconcile / debug)
    const { error: sessionSaveError } = await supabase
      .from('dmhoa_cases')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token)

    if (sessionSaveError) {
      console.warn('[create-checkout-session] failed saving stripe session id (non-fatal)', {
        message: sessionSaveError.message,
        code: sessionSaveError.code,
        details: sessionSaveError.details,
      })
    }

    // 5) Log event (non-fatal)
    const { error: eventError } = await supabase
      .from('dmhoa_events')
      .insert({
        token,
        type: 'checkout_session_created',
        data: {
          session_id: session.id,
          email_domain: email.split('@')[1] ?? null,
          amount: session.amount_total,
          currency: session.currency
        }
      })

    if (eventError) {
      console.warn('[create-checkout-session] failed to insert dmhoa_events (non-fatal)', {
        message: eventError.message,
        code: eventError.code,
        details: eventError.details,
      })
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[create-checkout-session] error', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})