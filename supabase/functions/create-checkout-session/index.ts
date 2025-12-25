// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Environment variables
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')
    const SITE_URL = Deno.env.get('SITE_URL')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !SITE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Stripe and Supabase
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body
    const { token, email, payload } = await req.json()

    if (!token || !email) {
      return new Response(
        JSON.stringify({ error: 'Token and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if case exists
    const { data: existingCase, error: fetchError } = await supabase
      .from('dmhoa_cases')
      .select('id, token, status')
      .eq('token', token)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database fetch error:', fetchError)
      throw new Error('Database error')
    }

    if (!existingCase) {
      return new Response(
        JSON.stringify({ error: 'Case not found. Please start a new case.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update case with email and pending status
    const { error: updateError } = await supabase
      .from('dmhoa_cases')
      .update({
        email: email,
        status: 'pending_payment',
        updated_at: new Date().toISOString()
      })
      .eq('token', token)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error('Failed to update case')
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/case.html?case=${encodeURIComponent(token)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/case-preview.html?case=${encodeURIComponent(token)}`,
      client_reference_id: token,
      customer_email: email,
      metadata: {
        token: token,
        source: 'dispute-my-hoa'
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    })

    // Log event
    await supabase
      .from('dmhoa_events')
      .insert({
        token: token,
        type: 'checkout_session_created',
        data: {
          session_id: session.id,
          email: email,
          amount: session.amount_total,
          currency: session.currency
        }
      })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Create checkout session error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
