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
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SALT_ROUNDS = 12;

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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
  fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(snapshots, null, 2), "utf-8");
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

// --- Auth (bcrypt hashed password) ---

interface AuthConfig {
  passwordHash: string;
  failedAttempts: number;
  lockUntil: number | null;
}

function getDefaultAuth(): AuthConfig {
  // Default password: admin123 (hashed on first init)
  const defaultHash = bcrypt.hashSync("admin123", SALT_ROUNDS);
  return { passwordHash: defaultHash, failedAttempts: 0, lockUntil: null };
}

function getAuthConfig(): AuthConfig {
  ensureDataDir();
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // Migration: if old plain-text password format, auto-upgrade to bcrypt
      if (parsed.password && !parsed.passwordHash) {
        const upgraded: AuthConfig = {
          passwordHash: bcrypt.hashSync(parsed.password, SALT_ROUNDS),
          failedAttempts: 0,
          lockUntil: null,
        };
        fs.writeFileSync(AUTH_FILE, JSON.stringify(upgraded, null, 2), "utf-8");
        return upgraded;
      }
      if (parsed.passwordHash) return parsed as AuthConfig;
    }
  } catch (e) {
    console.error("Error reading auth config:", e);
  }
  // First time: create default
  const defaultCfg = getDefaultAuth();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(defaultCfg, null, 2), "utf-8");
  return defaultCfg;
}

function saveAuthConfig(config: AuthConfig): void {
  ensureDataDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// Verify password with brute-force protection
export function verifyPassword(password: string): { success: boolean; locked: boolean; remainingAttempts: number } {
  const config = getAuthConfig();
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  // Check if account is locked
  if (config.lockUntil && Date.now() < config.lockUntil) {
    const remainingMin = Math.ceil((config.lockUntil - Date.now()) / 60000);
    return { success: false, locked: true, remainingAttempts: 0 };
  }

  // If lock period expired, reset
  if (config.lockUntil && Date.now() >= config.lockUntil) {
    config.failedAttempts = 0;
    config.lockUntil = null;
  }

  const isMatch = bcrypt.compareSync(password, config.passwordHash);

  if (isMatch) {
    // Reset on success
    config.failedAttempts = 0;
    config.lockUntil = null;
    saveAuthConfig(config);
    return { success: true, locked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  // Failed attempt
  config.failedAttempts += 1;
  const remaining = MAX_ATTEMPTS - config.failedAttempts;

  if (remaining <= 0) {
    config.lockUntil = Date.now() + LOCK_DURATION_MS;
    config.failedAttempts = 0;
    saveAuthConfig(config);
    return { success: false, locked: true, remainingAttempts: 0 };
  }

  saveAuthConfig(config);
  return { success: false, locked: false, remainingAttempts: remaining };
}

// Change password (requires current password verification)
export function changePassword(currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password baru minimal 6 karakter" };
  }
  if (newPassword.length > 64) {
    return { success: false, error: "Password maksimal 64 karakter" };
  }

  const config = getAuthConfig();
  const isMatch = bcrypt.compareSync(currentPassword, config.passwordHash);
  if (!isMatch) {
    return { success: false, error: "Password lama salah" };
  }

  config.passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  config.failedAttempts = 0;
  config.lockUntil = null;
  saveAuthConfig(config);
  return { success: true };
}