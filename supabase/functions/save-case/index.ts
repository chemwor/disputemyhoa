import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Supabase with service role (secure server-side access)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body
    const { token, payload } = await req.json()

    if (!token || !payload) {
      return new Response(
        JSON.stringify({ error: 'Token and payload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate token format
    if (!token.startsWith('case_')) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert case data (insert or update if exists)
    const { data, error } = await supabase
      .from('dmhoa_cases')
      .upsert(
        {
          token: token,
          payload: payload,
          status: 'new',
          unlocked: false,
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'token',
          ignoreDuplicates: false
        }
      )
      .select()

    if (error) {
      console.error('Database upsert error:', error)
      throw new Error('Failed to save case data')
    }

    // Log the save event for audit
    try {
      await supabase
        .from('dmhoa_events')
        .insert({
          token: token,
          type: 'case_saved',
          data: {
            payload_keys: Object.keys(payload),
            timestamp: new Date().toISOString()
          }
        })
    } catch (eventError) {
      console.warn('Failed to log event (non-critical):', eventError)
    }

    return new Response(
      JSON.stringify({ success: true, case_id: data[0]?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Save case error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
