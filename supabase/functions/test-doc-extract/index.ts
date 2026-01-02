// Test function to diagnose doc-extract-start authentication issues
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const DOC_EXTRACT_SECRET = Deno.env.get('DOC_EXTRACT_WEBHOOK_SECRET')

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
        DOC_EXTRACT_SECRET: !!DOC_EXTRACT_SECRET,
        DOC_EXTRACT_SECRET_LENGTH: DOC_EXTRACT_SECRET?.length || 0
      },
      test_call_result: null
    }

    if (DOC_EXTRACT_SECRET && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // Test calling doc-extract-start
      try {
        const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/doc-extract-start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-doc-secret': DOC_EXTRACT_SECRET,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            token: 'test_token_123',
            storage_path: 'test/path.pdf',
            filename: 'test.pdf',
            mime_type: 'application/pdf'
          })
        })

        const responseText = await testResponse.text()

        diagnostics.test_call_result = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          response: responseText
        }
      } catch (error) {
        diagnostics.test_call_result = {
          error: error.message
        }
      }
    }

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
