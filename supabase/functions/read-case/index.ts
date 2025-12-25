import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let token: string

    if (req.method === 'GET') {
      // Extract token from query parameters
      const url = new URL(req.url)
      token = url.searchParams.get('token') ?? ''
    } else if (req.method === 'POST') {
      // Extract token from request body
      const body = await req.json()
      token = body.token ?? ''
    } else {
      throw new Error('Method not allowed')
    }

    if (!token) {
      throw new Error('Token is required')
    }

    // Fetch case data
    const { data: caseData, error } = await supabaseClient
      .from('dmhoa_cases')
      .select('id, token, email, unlocked, status, created_at, payload')
      .eq('token', token)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Case not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        )
      }
      throw error
    }

    // Mask email for privacy (show only first 2 chars and domain)
    let maskedEmail = null
    if (caseData.email) {
      const parts = caseData.email.split('@')
      if (parts.length === 2) {
        const localPart = parts[0]
        const domain = parts[1]
        const maskedLocal = localPart.length > 2
          ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
          : localPart
        maskedEmail = `${maskedLocal}@${domain}`
      }
    }

    // Return case data with masked email
    const responseData = {
      id: caseData.id,
      token: caseData.token,
      email: maskedEmail,
      unlocked: caseData.unlocked,
      status: caseData.status,
      created_at: caseData.created_at,
      payload: caseData.payload
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error reading case:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
