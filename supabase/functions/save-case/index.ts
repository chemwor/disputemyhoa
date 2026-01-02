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
    const { data: existingCase, error: checkError } = await supabase
      .from('dmhoa_cases')
      .select('id, payload, created_at')
      .eq('token', token)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing case:', checkError)
      // Continue anyway, might be a new case
    }

    let result;
    let finalPayload;

    if (existingCase) {
      // Case exists - update with merged payload
      const mergedPayload = {
        ...existingCase.payload,
        ...payload
      }
      finalPayload = mergedPayload

      console.log('Updating existing case:', token)
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
        throw new Error(`Failed to update case data: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.error('Update returned no data')
        throw new Error('Case update failed - no data returned')
      }

      result = data
      console.log('Case updated successfully:', token, 'ID:', data[0]?.id)
    } else {
      // Case doesn't exist - create new
      finalPayload = payload
      console.log('Creating new case:', token)

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
        throw new Error(`Failed to create case data: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.error('Insert returned no data')
        throw new Error('Case creation failed - no data returned')
      }

      result = data
      console.log('Case created successfully:', token, 'ID:', data[0]?.id)
    }

    // Verify the case was actually saved by immediately reading it back
    console.log('Verifying case was saved...')
    const { data: verification, error: verifyError } = await supabase
      .from('dmhoa_cases')
      .select('id, token, created_at')
      .eq('token', token)
      .maybeSingle()

    if (verifyError) {
      console.error('Verification query error:', verifyError)
    } else if (!verification) {
      console.error('CRITICAL: Case was not found immediately after save!')
      throw new Error('Case save verification failed - case not found in database')
    } else {
      console.log('Case verification successful:', verification.id, verification.created_at)
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

    // CRITICAL FIX: Add delay before triggering document extraction to ensure database commit is propagated
    setTimeout(() => {
      triggerDocumentExtractionAsync(token, finalPayload, supabase).catch(error => {
        console.warn('Document extraction trigger failed (non-critical):', error)
      })
    }, 2000) // Wait 2 seconds to ensure database commit is fully propagated

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

// Async function to trigger document extraction without blocking the save operation
async function triggerDocumentExtractionAsync(token: string, payload: any, supabase: any) {
  try {
    console.log('Checking if document extraction is needed for token:', token)

    // Check if there are uploaded documents that need processing
    const needsExtraction = (
      // Has uploaded file but extraction hasn't been triggered yet
      (payload.pastedText || payload.additional_docs?.length > 0) &&
      payload.extract_status === 'pending'
    )

    if (!needsExtraction) {
      console.log('No document extraction needed')
      return
    }

    console.log('Document extraction needed, preparing to trigger...')

    // Get environment variables for doc-extract-start
    const DOC_EXTRACT_SECRET = Deno.env.get('DOC_EXTRACT_WEBHOOK_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')

    console.log('Environment check for doc extraction:', {
      hasSecret: !!DOC_EXTRACT_SECRET,
      hasUrl: !!SUPABASE_URL
    })

    if (!DOC_EXTRACT_SECRET) {
      console.warn('DOC_EXTRACT_WEBHOOK_SECRET not configured, skipping document extraction')
      // Update case to indicate extraction is not configured
      await supabase
        .from('dmhoa_cases')
        .update({
          payload: {
            ...payload,
            extract_status: 'not_configured',
            extract_error: 'DOC_EXTRACT_WEBHOOK_SECRET environment variable not set'
          }
        })
        .eq('token', token)
      return
    }

    // For pasted text, we'll create a virtual "document"
    let storage_path = null
    let filename = null
    let mime_type = null

    if (payload.pastedText) {
      // Handle pasted text as a virtual document
      storage_path = `virtual/${token}/pasted_text.txt`
      filename = 'pasted_text.txt'
      mime_type = 'text/plain'
      console.log('Processing pasted text as virtual document')
    } else if (payload.additional_docs?.length > 0) {
      // Handle actual uploaded files
      const firstDoc = payload.additional_docs[0]
      storage_path = firstDoc.storage_path || firstDoc.path
      filename = firstDoc.filename || firstDoc.name
      mime_type = firstDoc.mime_type || firstDoc.type
      console.log('Processing uploaded document:', filename)
    }

    if (!storage_path) {
      console.warn('No storage path found for document extraction')
      return
    }

    // Call doc-extract-start function
    console.log('Calling doc-extract-start function...')
    const extractResponse = await fetch(`${SUPABASE_URL}/functions/v1/doc-extract-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-doc-secret': DOC_EXTRACT_SECRET,
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        token: token,
        storage_path: storage_path,
        filename: filename,
        mime_type: mime_type
      })
    })

    console.log('Extract response status:', extractResponse.status)

    if (extractResponse.ok) {
      console.log('Document extraction triggered successfully')
      // Update case to mark extraction as triggered
      await supabase
        .from('dmhoa_cases')
        .update({
          payload: {
            ...payload,
            extract_status: 'triggered',
            extract_triggered_at: new Date().toISOString()
          }
        })
        .eq('token', token)
    } else if (extractResponse.status === 404) {
      console.warn('doc-extract-start function not deployed yet, skipping extraction')
      // Update case to indicate extraction is not yet available
      await supabase
        .from('dmhoa_cases')
        .update({
          payload: {
            ...payload,
            extract_status: 'not_deployed',
            extract_error: 'Document extraction function not yet deployed'
          }
        })
        .eq('token', token)
    } else if (extractResponse.status === 401) {
      console.error('Unauthorized - check DOC_EXTRACT_WEBHOOK_SECRET configuration')
      const errorText = await extractResponse.text()
      await supabase
        .from('dmhoa_cases')
        .update({
          payload: {
            ...payload,
            extract_status: 'auth_failed',
            extract_error: 'Authentication failed - check webhook secret configuration'
          }
        })
        .eq('token', token)
    } else {
      const errorText = await extractResponse.text()
      console.error('Failed to trigger document extraction:', extractResponse.status, errorText)
      // Update case with specific error information
      await supabase
        .from('dmhoa_cases')
        .update({
          payload: {
            ...payload,
            extract_status: 'failed',
            extract_error: `HTTP ${extractResponse.status}: ${errorText}`.slice(0, 500)
          }
        })
        .eq('token', token)
    }

  } catch (error) {
    console.error('Error in triggerDocumentExtractionAsync:', error)
  }
}
