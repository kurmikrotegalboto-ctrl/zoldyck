import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, string> = {};

  // Check Supabase env vars
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const secret = process.env.TOKEN_SECRET || process.env.AUTH_PASSWORD_HASH;

  results.supabase_url = url ? "SET" : "MISSING";
  results.supabase_key = key ? "SET" : "MISSING";
  results.auth_secret = secret ? "SET" : "MISSING";

  // Try actual Supabase connection
  if (url && key) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { count, error } = await sb
        .from("snapshots")
        .select("*", { count: "exact", head: true });

      if (error) {
        results.supabase_connection = "ERROR: " + error.message;
      } else {
        results.supabase_connection = "OK";
        results.snapshot_count = String(count ?? 0);
      }
    } catch (e: unknown) {
      results.supabase_connection = "FAILED: " + (e instanceof Error ? e.message : String(e));
    }
  } else {
    results.supabase_connection = "SKIPPED (no credentials)";
  }

  const isHealthy = results.supabase_connection === "OK" && results.auth_secret === "SET";

  return NextResponse.json(
    { healthy: isHealthy, ...results },
    { status: isHealthy ? 200 : 503 }
  );
}