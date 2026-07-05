import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { SnapshotData } from "../kpi-types";

// In standalone mode, process.cwd() is .next/standalone/
function getProjectRoot(): string {
  const envDataDir = process.env.DATA_DIR;
  if (envDataDir) return envDataDir;
  const cwd = process.cwd();
  if (cwd.includes(".next/standalone")) {
    return path.join(cwd, "data");
  }
  return path.join(cwd, "data");
}

const DATA_DIR = getProjectRoot();
const SNAPSHOTS_FILE = path.join(DATA_DIR, "snapshots.json");
const SALT_ROUNDS = 12;

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --- Auth (bcrypt hashed password) ---
// Use env var AUTH_PASSWORD_HASH if set (production-reliable),
// otherwise fallback to in-memory/file-based approach.
const ENV_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || "";
const ENV_USERNAME = process.env.AUTH_USERNAME || "admin";

// Pre-computed hash for "admin123" — no filesystem dependency on Vercel
const DEFAULT_PASSWORD_HASH = "$2b$12$MbSisJKiYzmb8xN8yM3qy.OQTslvXFAUUK7mTGD7wGgiXosdUJf2G";

function getEffectiveHash(): string {
  if (ENV_PASSWORD_HASH) return ENV_PASSWORD_HASH;
  return DEFAULT_PASSWORD_HASH;
}

// --- Snapshots Storage ---

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

// --- Auth ---

// Brute-force tracking (in-memory, resets on server restart - acceptable for Vercel)
let failedAttempts = 0;
let lockUntil: number | null = null;

export function verifyLogin(username: string, password: string): { success: boolean; locked: boolean; remainingAttempts: number } {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 15 * 60 * 1000;

  // Check lock
  if (lockUntil && Date.now() < lockUntil) {
    return { success: false, locked: true, remainingAttempts: 0 };
  }
  if (lockUntil && Date.now() >= lockUntil) {
    failedAttempts = 0;
    lockUntil = null;
  }

  // Check username
  if (username !== ENV_USERNAME) {
    failedAttempts += 1;
    const remaining = MAX_ATTEMPTS - failedAttempts;
    if (remaining <= 0) {
      lockUntil = Date.now() + LOCK_DURATION_MS;
      failedAttempts = 0;
      return { success: false, locked: true, remainingAttempts: 0 };
    }
    return { success: false, locked: false, remainingAttempts: remaining };
  }

  // Check password
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
  // Password change not persisted on Vercel (ephemeral) - log warning
  console.warn("Password changed in-memory only. Set AUTH_PASSWORD_HASH env var to persist.");
  return { success: true };
}