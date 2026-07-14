import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, string> = {};

  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  const secret = process.env.TOKEN_SECRET || process.env.AUTH_PASSWORD_HASH;

  results.auth_secret = secret ? "SET" : "MISSING";
  results.supabase_url = url ? "SET" : "MISSING";
  results.supabase_key = key ? "SET" : "MISSING";

  // Mask the URL for display
  if (url) {
    try {
      const u = new URL(url);
      results.supabase_host = u.hostname;
      results.supabase_protocol = u.protocol;
    } catch {
      results.supabase_host = "INVALID_URL";
    }
  }

  // Step 1: Basic fetch test to the Supabase URL
  if (url) {
    try {
      const testUrl = url.replace(/\/$/, "") + "/rest/v1/";
      const testRes = await fetch(testUrl, {
        method: "GET",
        headers: {
          "apikey": key,
          "Authorization": "Bearer " + key,
        },
        signal: AbortSignal.timeout(10000),
      });
      results.http_status = String(testRes.status);
      results.http_ok = testRes.ok ? "YES" : "NO";
      // Supabase returns {} for empty table, which is fine
      if (testRes.ok) {
        results.network = "OK";
      } else {
        const body = await testRes.text().catch(() => "");
        results.http_body = body.substring(0, 200);
        results.network = "HTTP_ERROR";
      }
    } catch (e: unknown) {
      results.network = "FAILED";
      if (e instanceof Error) {
        results.error_type = e.constructor.name;
        results.error_message = e.message;
        // Check for common causes
        if (e.message.includes("ECONNREFUSED")) {
          results.diagnosis = "Connection refused - Supabase project may be PAUSED (free tier). Open Supabase Dashboard and resume the project.";
        } else if (e.message.includes("ENOTFOUND")) {
          results.diagnosis = "DNS resolution failed - Supabase URL may be incorrect or Supabase is down.";
        } else if (e.message.includes("fetch failed")) {
          results.diagnosis = "Fetch failed - Possible causes: (1) Supabase project paused, (2) URL incorrect, (3) Vercel network restriction. Check Supabase Dashboard.";
        } else if (e.message.includes("timeout")) {
          results.diagnosis = "Connection timeout - Supabase may be slow or unreachable from Vercel.";
        }
      }
    }
  }

  // Step 2: Try actual query
  if (url && key && results.network === "OK") {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { count, error } = await sb
        .from("snapshots")
        .select("*", { count: "exact", head: true });

      if (error) {
        results.db_query = "ERROR: " + error.message;
        results.db_code = String(error.code);
      } else {
        results.db_query = "OK";
        results.snapshot_count = String(count ?? 0);
      }
    } catch (e: unknown) {
      results.db_query = "FAILED: " + (e instanceof Error ? e.message : String(e));
    }
  }

  const isHealthy = results.network === "OK" && results.db_query === "OK" && results.auth_secret === "SET";

  return NextResponse.json(
    { healthy: isHealthy, ...results },
    { status: isHealthy ? 200 : 503 }
  );
}