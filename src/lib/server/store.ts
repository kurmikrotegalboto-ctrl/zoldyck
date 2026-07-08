import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { SnapshotData } from "../kpi-types";
import { supabase } from "../supabase";

// ── Paths (only used for auth) ──
function getProjectRoot(): string {
  const envDataDir = process.env.DATA_DIR;
  if (envDataDir) return envDataDir;
  return path.join(process.cwd(), "data");
}

const DATA_DIR = getProjectRoot();
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SALT_ROUNDS = 12;

// ── Helpers ──
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ══════════════════════════════════════════════════════════════════
// SECURE TOKEN SYSTEM — HMAC-signed, no server-side storage needed
// ══════════════════════════════════════════════════════════════════

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Token secret: from env var ONLY (required for Edge-compatible middleware)
let _cachedSecret: string | null = null;

function getTokenSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  const envSecret = process.env.TOKEN_SECRET;
  if (envSecret) { _cachedSecret = envSecret; return envSecret; }
  const pwHash = process.env.AUTH_PASSWORD_HASH || ENV_PASSWORD_HASH;
  if (pwHash) { _cachedSecret = pwHash; return pwHash; }
  const secret = crypto.randomBytes(32).toString("hex");
  _cachedSecret = secret;
  return secret;
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
// AUTH — Password management with file persistence
// ══════════════════════════════════════════════════════════════════

const ENV_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || "";
const ENV_USERNAME = process.env.AUTH_USERNAME || "admin";

interface AuthData {
  passwordHash?: string;
  username?: string;
}

function loadAuthData(): AuthData {
  ensureDataDir();
  try {
    if (fs.existsSync(AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveAuthData(data: AuthData): void {
  ensureDataDir();
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save auth data:", e);
  }
}

function getEffectiveHash(): string {
  if (ENV_PASSWORD_HASH) return ENV_PASSWORD_HASH;

  const authData = loadAuthData();
  if (authData.passwordHash) return authData.passwordHash;

  const randomPwd = crypto.randomBytes(8).toString("hex");
  const hash = bcrypt.hashSync(randomPwd, SALT_ROUNDS);
  saveAuthData({ passwordHash: hash });
  return hash;
}

function getEffectiveUsername(): string {
  const authData = loadAuthData();
  return authData.username || ENV_USERNAME;
}

// ── Brute-force protection (in-memory) ──
let failedAttempts = 0;
let lockUntil: number | null = null;

export function verifyLogin(username: string, password: string): { success: boolean; locked: boolean; remainingAttempts: number } {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 15 * 60 * 1000;

  if (lockUntil && Date.now() < lockUntil) {
    return { success: false, locked: true, remainingAttempts: 0 };
  }
  if (lockUntil && Date.now() >= lockUntil) {
    failedAttempts = 0;
    lockUntil = null;
  }

  if (username !== getEffectiveUsername()) {
    failedAttempts += 1;
    const remaining = MAX_ATTEMPTS - failedAttempts;
    if (remaining <= 0) {
      lockUntil = Date.now() + LOCK_DURATION_MS;
      failedAttempts = 0;
      return { success: false, locked: true, remainingAttempts: 0 };
    }
    return { success: false, locked: false, remainingAttempts: remaining };
  }

  const hash = getEffectiveHash();
  const isMatch = bcrypt.compareSync(password, hash);

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

export function changePassword(currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password baru minimal 6 karakter" };
  }
  if (newPassword.length > 64) {
    return { success: false, error: "Password maksimal 64 karakter" };
  }
  const hash = getEffectiveHash();
  const isMatch = bcrypt.compareSync(currentPassword, hash);
  if (!isMatch) {
    return { success: false, error: "Password lama salah" };
  }

  const newHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  const authData = loadAuthData();
  authData.passwordHash = newHash;
  saveAuthData(authData);

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
  // Check if snapshot exists for this date
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

  // Upsert with merged units
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