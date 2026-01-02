// supabase/functions/doc-extract-start/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-doc-secret",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const WEBHOOK_URL = Deno.env.get("DOC_EXTRACT_WEBHOOK_URL"); // your Heroku endpoint
    const WEBHOOK_SECRET = Deno.env.get("DOC_EXTRACT_WEBHOOK_SECRET"); // must match x-doc-secret

    console.log('Environment check:', {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
      WEBHOOK_URL: !!WEBHOOK_URL,
      WEBHOOK_SECRET: !!WEBHOOK_SECRET
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE env vars');
      return json(500, { error: "Missing SUPABASE env vars" });
    }
    if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
      console.error('Missing webhook env vars');
      return json(500, { error: "Missing webhook env vars" });
    }

    // ✅ Validate secret header
    const incomingSecret = req.headers.get("x-doc-secret")?.trim() ?? "";
    console.log('Secret validation:', {
      incomingSecret: !!incomingSecret,
      expectedSecret: !!WEBHOOK_SECRET,
      matches: incomingSecret === WEBHOOK_SECRET
    });

    if (!incomingSecret || incomingSecret !== WEBHOOK_SECRET) {
      console.error('Unauthorized - secret mismatch');
      return json(401, { error: "Unauthorized" });
    }

    console.log('Creating Supabase client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Parsing request body...');
    const body = await req.json().catch((parseError) => {
      console.error('JSON parse error:', parseError);
      return null;
    });
    console.log('Request body:', body);

    const token = body?.token?.toString()?.trim();
    const storage_path = body?.storage_path?.toString()?.trim();
    const filename = body?.filename?.toString()?.trim() ?? null;
    const mime_type = body?.mime_type?.toString()?.trim() ?? null;

    if (!token || !storage_path) {
      console.error('Missing required fields:', { token: !!token, storage_path: !!storage_path });
      return json(400, { error: "token and storage_path are required" });
    }

    // Add detailed token debugging
    console.log('Token analysis:', {
      receivedToken: token,
      tokenLength: token.length,
      tokenType: typeof token,
      firstChar: token.charAt(0),
      lastChar: token.charAt(token.length - 1),
      hasWhitespace: token !== token.trim(),
      tokenBytes: Array.from(token).map(c => c.charCodeAt(0))
    });

    // Helper for deep token debug
    function debugTokenMatch(dbToken: any) {
      const dbTokenStr = String(dbToken);
      return {
        dbToken: dbTokenStr,
        dbTokenLength: dbTokenStr.length,
        dbTokenType: typeof dbTokenStr,
        dbTokenFirstChar: dbTokenStr.charAt(0),
        dbTokenLastChar: dbTokenStr.charAt(dbTokenStr.length - 1),
        dbTokenHasWhitespace: dbTokenStr !== dbTokenStr.trim(),
        dbTokenBytes: Array.from(dbTokenStr).map(c => c.charCodeAt(0)),
        matchRaw: dbTokenStr === token,
        matchTrim: dbTokenStr.trim() === token.trim(),
        matchLower: dbTokenStr.trim().toLowerCase() === token.trim().toLowerCase()
      };
    }

    // (Optional but recommended) Ensure case exists
    console.log('Looking up case with token:', token);

    let finalCaseRow: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // Always normalize token before querying
    const normalizedToken = String(token).trim();

    // Add retry logic for case lookup in case of timing issues
    while (retryCount <= maxRetries && !finalCaseRow) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount}/${maxRetries} after ${retryDelay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        console.log(`Attempting case lookup (attempt ${retryCount + 1})...`);

        // Use normalized token in query
        const { data: caseRow, error: caseErr } = await supabase
          .from("dmhoa_cases")
          .select("id, token, payload, created_at, updated_at")
          .eq("token", normalizedToken)
          .maybeSingle();

        console.log('Database query result:', {
          attempt: retryCount + 1,
          found: !!caseRow,
          error: caseErr?.message || null,
          errorCode: caseErr?.code || null,
          caseId: caseRow?.id || null,
          tokenMatch: caseRow && String(caseRow.token).trim() === normalizedToken,
          actualToken: caseRow?.token || 'none'
        });

        if (caseErr) {
          console.error('Database error reading case:', caseErr);

          // Only try alternative approach on the last retry
          if (retryCount === maxRetries) {
            console.log('Final retry: trying alternative query approach...');
            const { data: allCases, error: allCasesErr } = await supabase
              .from("dmhoa_cases")
              .select("id, token, payload, created_at, updated_at")
              .order("created_at", { ascending: false })
              .limit(50); // Get more recent cases

            console.log('All cases query result:', {
              success: !allCasesErr,
              count: allCases?.length || 0,
              error: allCasesErr?.message || null,
              recentTokens: allCases?.slice(0, 5).map(c => ({ token: c.token, created: c.created_at })) || []
            });

            if (allCasesErr) {
              return json(500, { error: "Database connection error", details: allCasesErr.message });
            }

            // Fallback: manual search with normalized comparison
            const foundCase = allCases?.find(c => String(c.token).trim() === normalizedToken);
            if (allCases) {
              console.log('Token match debug for all cases:', allCases.map(c => debugTokenMatch(c.token)));
            }
            if (foundCase) {
              console.log('Found case via alternative query:', foundCase.token);
              finalCaseRow = foundCase;
              break;
            }
          }
        } else if (caseRow) {
          // Use normalized comparison for safety
          if (String(caseRow.token).trim() === normalizedToken) {
            console.log('Case found successfully:', caseRow.token);
            finalCaseRow = caseRow;
            break;
          } else {
            console.log('CaseRow token mismatch after query:', { dbToken: caseRow.token, normalizedToken });
          }
        }

        retryCount++;
      } catch (queryError: any) {
        console.error(`Query exception on attempt ${retryCount + 1}:`, queryError);
        retryCount++;
        if (retryCount > maxRetries) {
          return json(500, { error: "Database query failed after retries", details: queryError.message });
        }
      }
    }

    if (!finalCaseRow) {
      console.error('Case not found after all attempts. Token:', normalizedToken);

      // Get some sample tokens for debugging
      const { data: sampleCases } = await supabase
        .from("dmhoa_cases")
        .select("token, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      console.log('Recent tokens in database:', sampleCases?.map(c => ({
        token: c.token,
        created: c.created_at,
        isMatch: String(c.token).trim() === normalizedToken
      })));

      if (sampleCases) {
        console.log('Token match debug for sample cases:', sampleCases.map(c => debugTokenMatch(c.token)));
      }

      return json(404, {
        error: "Case not found",
        requestedToken: normalizedToken,
        recentTokens: sampleCases?.slice(0, 5).map(c => c.token),
        suggestion: "The case may not have been created yet. Please ensure the case is created before calling this function."
      });
    }

    console.log('Using case data:', {
      id: finalCaseRow.id,
      token: finalCaseRow.token,
      hasPayload: !!finalCaseRow.payload,
      createdAt: finalCaseRow.created_at
    });

    // ✅ Mark as triggered
    console.log('Preparing payload update...');

    // Handle the payload being either a JSON object or a JSON string
    let currentPayload = {};
    try {
      if (typeof finalCaseRow.payload === 'string') {
        currentPayload = JSON.parse(finalCaseRow.payload);
      } else if (typeof finalCaseRow.payload === 'object' && finalCaseRow.payload !== null) {
        currentPayload = finalCaseRow.payload;
      }
    } catch (parseErr) {
      console.warn('Could not parse existing payload, using empty object:', parseErr);
      currentPayload = {};
    }

    const nextPayload = {
      ...currentPayload,
      extract_status: "triggered",
      notice_storage_path: storage_path,
      notice_filename: filename,
      notice_mime_type: mime_type,
      extract_triggered_at: new Date().toISOString(),
    };

    console.log('Updating case payload...');
    const { error: upErr } = await supabase
      .from("dmhoa_cases")
      .update({ payload: nextPayload })
      .eq("token", token);

    if (upErr) {
      console.error('Database error updating case:', upErr);
      return json(500, { error: "Database error updating case", details: upErr.message });
    }

    // ✅ Call Python webhook (server-to-server)
    console.log('Calling webhook:', WEBHOOK_URL);
    const webhookRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-doc-secret": WEBHOOK_SECRET, // pass through to python
      },
      body: JSON.stringify({
        token,
        storage_path,
        filename,
        mime_type,
        supabase_url: SUPABASE_URL, // optional if python needs it
      }),
    });

    console.log('Webhook response:', {
      status: webhookRes.status,
      statusText: webhookRes.statusText
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => "");
      console.error('Webhook call failed:', text);
      // Mark failed but don't crash everything
      const failedPayload = {
        ...nextPayload,
        extract_status: "failed",
        extract_error: `Webhook ${webhookRes.status}: ${text}`.slice(0, 1500),
        extract_failed_at: new Date().toISOString(),
      };
      await supabase.from("dmhoa_cases").update({ payload: failedPayload }).eq("token", token);

      return json(502, { error: "Webhook call failed", details: text });
    }

    const webhookJson = await webhookRes.json().catch(() => ({}));
    console.log('Webhook success:', webhookJson);

    // Mark queued/accepted
    const okPayload = {
      ...nextPayload,
      extract_status: "queued",
      webhook_response: webhookJson,
      extract_queued_at: new Date().toISOString(),
    };
    await supabase.from("dmhoa_cases").update({ payload: okPayload }).eq("token", token);

    console.log('Process completed successfully');
    return json(200, { ok: true, token, storage_path, webhook: webhookJson });

  } catch (e: any) {
    console.error('Unexpected error:', e);
    console.error('Error stack:', e.stack);
    return json(500, { error: e?.message ?? "server error", stack: e?.stack?.substring(0, 500) });
  }
});
