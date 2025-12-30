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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => null);
    console.log('Request body:', body);

    const token = body?.token?.toString()?.trim();
    const storage_path = body?.storage_path?.toString()?.trim();
    const filename = body?.filename?.toString()?.trim() ?? null;
    const mime_type = body?.mime_type?.toString()?.trim() ?? null;

    if (!token || !storage_path) {
      console.error('Missing required fields:', { token: !!token, storage_path: !!storage_path });
      return json(400, { error: "token and storage_path are required" });
    }

    // (Optional but recommended) Ensure case exists
    console.log('Looking up case:', token);
    const { data: caseRow, error: caseErr } = await supabase
      .from("dmhoa_cases")
      .select("token, payload")
      .eq("token", token)
      .maybeSingle();

    if (caseErr) {
      console.error('Database error reading case:', caseErr);
      return json(500, { error: "Database error reading case" });
    }
    if (!caseRow) {
      console.error('Case not found:', token);
      return json(404, { error: "Case not found" });
    }

    console.log('Case found:', caseRow.token);

    // ✅ Mark as triggered
    const nextPayload = {
      ...(caseRow.payload ?? {}),
      extract_status: "triggered",
      notice_storage_path: storage_path,
      notice_filename: filename,
      notice_mime_type: mime_type,
      extract_triggered_at: new Date().toISOString(),
    };

    console.log('Updating case payload');
    const { error: upErr } = await supabase
      .from("dmhoa_cases")
      .update({ payload: nextPayload })
      .eq("token", token);

    if (upErr) {
      console.error('Database error updating case:', upErr);
      return json(500, { error: "Database error updating case" });
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
    return json(500, { error: e?.message ?? "server error" });
  }
});
