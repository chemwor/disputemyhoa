import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

serve(async (req) => {
  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )

    console.log('Received webhook event:', event.type)

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract token from client_reference_id or metadata
      const token = session.client_reference_id || session.metadata?.token

      if (!token) {
        console.error('No token found in checkout session')
        return new Response('No token found', { status: 400 })
      }

      console.log('Processing payment for token:', token)

      // Update case to unlocked status
      const { error: updateError } = await supabaseClient
        .from('dmhoa_cases')
        .update({
          unlocked: true,
          status: 'paid',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_total: session.amount_total,
          currency: session.currency
        })
        .eq('token', token)

      if (updateError) {
        console.error('Error updating case:', updateError)
        throw updateError
      }

      // Log the successful payment
      await supabaseClient
        .from('dmhoa_events')
        .insert({
          token,
          type: 'payment_completed',
          data: {
            session_id: session.id,
            payment_intent_id: session.payment_intent,
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email
          }
        })

      console.log('Successfully processed payment for token:', token)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
