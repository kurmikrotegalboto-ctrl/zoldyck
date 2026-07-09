import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { SnapshotData } from "../kpi-types";
import { supabase } from "./supabase";

const SALT_ROUNDS = 12;

// ══════════════════════════════════════════════════════════════════
// SECURE TOKEN SYSTEM — HMAC-signed, no server-side storage needed
// ══════════════════════════════════════════════════════════════════

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

let _cachedSecret: string | null = null;

function getTokenSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  const envSecret = process.env.TOKEN_SECRET;
  if (envSecret) { _cachedSecret = envSecret; return envSecret; }
  const pwHash = process.env.AUTH_PASSWORD_HASH || "";
  if (pwHash) { _cachedSecret = pwHash; return pwHash; }
  // CRITICAL: No random fallback! Without a stable secret, tokens created
  // on one serverless instance can NEVER be verified by middleware on another.
  throw new Error("TOKEN_SECRET or AUTH_PASSWORD_HASH env var must be set for authentication.");
}

/** Create a signed token: `{expiry}.{base64_hmac}` */
export function createSignedToken(): string {
  const expiry = Date.now() + TOKEN_EXPIRY_MS;
  const payload = `${expiry}`;
  const secret = getTokenSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest();
  const signature = Buffer.from(hmac).toString("base64url");
  return `${payload}.${signature}`;
}

/** Verify a token (Node.js runtime) */
export function verifySignedToken(token: string): boolean {
  try {
    const secret = getTokenSecret();
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 0) return false;

    const payload = token.substring(0, dotIdx);
    const signature = token.substring(dotIdx + 1);

    const expected = crypto.createHmac("sha256", secret).update(payload).digest();
    const expectedB64 = Buffer.from(expected).toString("base64url");

    if (signature !== expectedB64) return false;

    const expiry = parseInt(payload, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;

    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// AUTH — Password & username via Supabase (persistent)
// ══════════════════════════════════════════════════════════════════

const ENV_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || "";
const ENV_USERNAME = process.env.AUTH_USERNAME || "admin";

// ── In-memory cache (avoids Supabase round-trip on every login) ──
let _cachedHash: string | null = null;
let _cachedUsername: string | null = null;
let _hashCacheTime = 0;
let _usernameCacheTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function invalidateAuthCache() {
  _cachedHash = null;
  _cachedUsername = null;
  _hashCacheTime = 0;
  _usernameCacheTime = 0;
}

async function getEffectiveHash(): Promise<string> {
  // 1. Return cached value if fresh
  if (_cachedHash && Date.now() - _hashCacheTime < CACHE_TTL_MS) {
    return _cachedHash;
  }

  // 2. Check env var first (instant, no network)
  if (ENV_PASSWORD_HASH) {
    _cachedHash = ENV_PASSWORD_HASH;
    _hashCacheTime = Date.now();
    return ENV_PASSWORD_HASH;
  }

  // 3. Query Supabase (only if no env var)
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "password_hash")
      .maybeSingle();
    if (!error && data?.value) {
      _cachedHash = data.value as string;
      _hashCacheTime = Date.now();
      return _cachedHash;
    }
  } catch {
    // Supabase unreachable — continue to throw
  }

  throw new Error("No password configured. Set AUTH_PASSWORD_HASH env var.");
}

async function getEffectiveUsername(): Promise<string> {
  // Always use env var (username rarely changes, avoids unnecessary DB call)
  return ENV_USERNAME;
}

// ── Brute-force protection (in-memory) ──
let failedAttempts = 0;
let lockUntil: number | null = null;

export async function verifyLogin(username: string, password: string): Promise<{ success: boolean; locked: boolean; remainingAttempts: number }> {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 15 * 60 * 1000;

  if (lockUntil && Date.now() < lockUntil) {
    return { success: false, locked: true, remainingAttempts: 0 };
  }
  if (lockUntil && Date.now() >= lockUntil) {
    failedAttempts = 0;
    lockUntil = null;
  }

  const effectiveUsername = await getEffectiveUsername();

  if (username !== effectiveUsername) {
    failedAttempts += 1;
    const remaining = MAX_ATTEMPTS - failedAttempts;
    if (remaining <= 0) {
      lockUntil = Date.now() + LOCK_DURATION_MS;
      failedAttempts = 0;
      return { success: false, locked: true, remainingAttempts: 0 };
    }
    return { success: false, locked: false, remainingAttempts: remaining };
  }

  const hash = await getEffectiveHash();
  const isMatch = await bcrypt.compare(password, hash);

  if (isMatch) {
    failedAttempts = 0;
    lockUntil = null;
    return { success: true, locked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  failedAttempts += 1;
  const remaining = MAX_ATTEMPTS - failedAttempts;
  if (remaining <= 0) {
    lockUntil = Date.now() + LOCK_DURATION_MS;
    failedAttempts = 0;
    return { success: false, locked: true, remainingAttempts: 0 };
  }
  return { success: false, locked: false, remainingAttempts: remaining };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password baru minimal 6 karakter" };
  }
  if (newPassword.length > 64) {
    return { success: false, error: "Password maksimal 64 karakter" };
  }

  const hash = await getEffectiveHash();
  const isMatch = await bcrypt.compare(currentPassword, hash);
  if (!isMatch) {
    return { success: false, error: "Password lama salah" };
  }

  // Save new hash to Supabase (persistent across deploys)
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: "password_hash", value: newHash },
      { onConflict: "key" }
    );

  if (error) {
    return { success: false, error: "Gagal menyimpan password baru ke database" };
  }

  invalidateAuthCache(); // force next login to use new hash
  return { success: true };
}

// ══════════════════════════════════════════════════════════════════
// SNAPSHOTS STORAGE — Supabase (persistent)
// ══════════════════════════════════════════════════════════════════

export async function getSnapshots(): Promise<SnapshotData[]> {
  try {
    const { data, error } = await supabase
      .from("snapshots")
      .select("date, date_sort, units")
      .order("date_sort", { ascending: true });

    if (error) {
      console.error("Supabase getSnapshots error:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
      date: row.date,
      dateSort: row.date_sort,
      units: row.units,
    }));
  } catch (e) {
    console.error("getSnapshots error:", e);
    return [];
  }
}

export async function addOrUpdateSnapshot(newSnapshot: SnapshotData): Promise<SnapshotData[]> {
  const { data: existing, error: fetchError } = await supabase
    .from("snapshots")
    .select("units")
    .eq("date_sort", newSnapshot.dateSort)
    .maybeSingle();

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError.message);
    throw new Error("Gagal mengecek data snapshot");
  }

  let finalUnits = newSnapshot.units;

  // Merge logic: if snapshot exists, merge units at unit-code level
  if (existing?.units) {
    const currentUnits = [...existing.units];
    for (const unit of newSnapshot.units) {
      const unitIdx = currentUnits.findIndex((u: { code: string }) => u.code === unit.code);
      if (unitIdx >= 0) {
        currentUnits[unitIdx] = unit;
      } else {
        currentUnits.push(unit);
      }
    }
    finalUnits = currentUnits;
  }

  const { error: upsertError } = await supabase
    .from("snapshots")
    .upsert(
      {
        date: newSnapshot.date,
        date_sort: newSnapshot.dateSort,
        units: finalUnits,
      },
      { onConflict: "date_sort" }
    );

  if (upsertError) {
    console.error("Supabase upsert error:", upsertError.message);
    throw new Error("Gagal menyimpan snapshot ke database");
  }

  return getSnapshots();
}

export async function deleteSnapshot(dateSort: string): Promise<SnapshotData[]> {
  const { error } = await supabase
    .from("snapshots")
    .delete()
    .eq("date_sort", dateSort);

  if (error) {
    console.error("Supabase delete error:", error.message);
    throw new Error("Gagal menghapus snapshot dari database");
  }

  return getSnapshots();
}