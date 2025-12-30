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

    // Check if case already exists
    const { data: existingCase } = await supabase
      .from('dmhoa_cases')
      .select('id, payload, created_at')
      .eq('token', token)
      .single()

    let result;
    if (existingCase) {
      // Case exists - update with merged payload
      const mergedPayload = {
        ...existingCase.payload,
        ...payload
      }

      const { data, error } = await supabase
        .from('dmhoa_cases')
        .update({
          payload: mergedPayload,
          updated_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()

      if (error) {
        console.error('Database update error:', error)
        throw new Error('Failed to update case data')
      }

      result = data
      console.log('Case updated:', token)
    } else {
      // Case doesn't exist - create new
      const { data, error } = await supabase
        .from('dmhoa_cases')
        .insert({
          token: token,
          payload: payload,
          status: 'new',
          unlocked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('Database insert error:', error)
        throw new Error('Failed to create case data')
      }

      result = data
      console.log('Case created:', token)
    }

    // Log the save event for audit
    try {
      await supabase
        .from('dmhoa_events')
        .insert({
          token: token,
          type: existingCase ? 'case_updated' : 'case_created',
          data: {
            payload_keys: Object.keys(payload),
            timestamp: new Date().toISOString()
          }
        })
    } catch (eventError) {
      console.warn('Failed to log event (non-critical):', eventError)
    }

    return new Response(
      JSON.stringify({ success: true, case_id: result[0]?.id }),
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
