import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { SnapshotData } from "../kpi-types";

// ── Paths ──
function getProjectRoot(): string {
  const envDataDir = process.env.DATA_DIR;
  if (envDataDir) return envDataDir;
  return path.join(process.cwd(), "data");
}

const DATA_DIR = getProjectRoot();
const SNAPSHOTS_FILE = path.join(DATA_DIR, "snapshots.json");
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
// If not set, generate one at startup and log it (must be set on Vercel)
let _cachedSecret: string | null = null;

function getTokenSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  // 1. Explicit TOKEN_SECRET env var (best)
  const envSecret = process.env.TOKEN_SECRET;
  if (envSecret) { _cachedSecret = envSecret; return envSecret; }
  // 2. Derive from AUTH_PASSWORD_HASH (already set on Vercel, works in Edge)
  const pwHash = process.env.AUTH_PASSWORD_HASH || ENV_PASSWORD_HASH;
  if (pwHash) { _cachedSecret = pwHash; return pwHash; }
  // 3. Fallback: generate ephemeral secret
  const secret = crypto.randomBytes(32).toString("hex");
  _cachedSecret = secret;
  console.warn("[SECURITY] No TOKEN_SECRET or AUTH_PASSWORD_HASH set. Using ephemeral secret.");
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

/**
 * Verify a token (Node.js runtime) — returns true only if:
 * 1. HMAC signature matches (proves server issued it)
 * 2. Token has not expired
 */
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
  tokenSecret?: string;
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
  // 1. Env var takes priority (production best practice)
  if (ENV_PASSWORD_HASH) return ENV_PASSWORD_HASH;

  // 2. File-based hash (persisted password change)
  const authData = loadAuthData();
  if (authData.passwordHash) return authData.passwordHash;

  // 3. Generate a random password for first run
  const randomPwd = crypto.randomBytes(8).toString("hex"); // 16-char random password
  const hash = bcrypt.hashSync(randomPwd, SALT_ROUNDS);
  saveAuthData({ passwordHash: hash });
  console.warn(
    "\n" +
    "╔══════════════════════════════════════════════════════════════╗\n" +
    "║  SECURITY: No AUTH_PASSWORD_HASH env var set.              ║" +
    "\n" +
    "║  A random password has been generated and stored.          ║" +
    "\n" +
    `║  Password: ${randomPwd}                                ║` +
    "\n" +
    "║  Set AUTH_PASSWORD_HASH env var to use a fixed password.  ║" +
    "\n" +
    "╚══════════════════════════════════════════════════════════════╝\n"
  );
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

  // Persist the new hash to file
  const newHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  const authData = loadAuthData();
  authData.passwordHash = newHash;
  saveAuthData(authData);

  return { success: true };
}

// ══════════════════════════════════════════════════════════════════
// SNAPSHOTS STORAGE
// ══════════════════════════════════════════════════════════════════

export function getSnapshots(): SnapshotData[] {
  ensureDataDir();
  try {
    if (fs.existsSync(SNAPSHOTS_FILE)) {
      const raw = fs.readFileSync(SNAPSHOTS_FILE, "utf-8");
      return JSON.parse(raw) as SnapshotData[];
    }
  } catch (e) {
    console.error("Error reading snapshots:", e);
  }
  return [];
}

export function saveSnapshots(snapshots: SnapshotData[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(snapshots, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving snapshots:", e);
  }
}

export function addOrUpdateSnapshot(newSnapshot: SnapshotData): SnapshotData[] {
  const snapshots = getSnapshots();
  const existingIdx = snapshots.findIndex((s) => s.dateSort === newSnapshot.dateSort);

  if (existingIdx >= 0) {
    const existing = snapshots[existingIdx];
    const updatedUnits = [...existing.units];
    for (const unit of newSnapshot.units) {
      const unitIdx = updatedUnits.findIndex((u) => u.code === unit.code);
      if (unitIdx >= 0) {
        updatedUnits[unitIdx] = unit;
      } else {
        updatedUnits.push(unit);
      }
    }
    snapshots[existingIdx] = { ...existing, units: updatedUnits };
  } else {
    snapshots.push(newSnapshot);
  }

  snapshots.sort((a, b) => a.dateSort.localeCompare(b.dateSort));
  saveSnapshots(snapshots);
  return snapshots;
}

export function deleteSnapshot(dateSort: string): SnapshotData[] {
  let snapshots = getSnapshots();
  snapshots = snapshots.filter((s) => s.dateSort !== dateSort);
  saveSnapshots(snapshots);
  return snapshots;
}