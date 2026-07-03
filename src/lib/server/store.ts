import fs from "fs";
import path from "path";
import type { SnapshotData } from "../kpi-types";

// In standalone mode, process.cwd() is .next/standalone/
// Use __dirname to find the project root reliably
function getProjectRoot(): string {
  // In standalone build: server runs from .next/standalone/
  // __dirname for this file will be inside .next/standalone/.next/server/...
  // Walk up to find the standalone dir, then go up one more level to project root
  // For Docker: /app is the root, data/ should be at /app/data
  const envDataDir = process.env.DATA_DIR;
  if (envDataDir) return envDataDir;
  
  // Try common paths
  const cwd = process.cwd();
  // If we're in .next/standalone, data should be relative to the parent or current dir
  if (cwd.includes(".next/standalone")) {
    return path.join(cwd, "data");
  }
  // Docker or direct run
  return path.join(cwd, "data");
}

const DATA_DIR = getProjectRoot();
const SNAPSHOTS_FILE = path.join(DATA_DIR, "snapshots.json");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");

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
    // Merge units - update existing units, add new ones
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
  
  // Sort by date
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

// --- Auth (simple password) ---

export function getAuthConfig(): { password: string } {
  ensureDataDir();
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading auth config:", e);
  }
  // Default password
  return { password: "admin123" };
}

export function setAuthConfig(password: string): void {
  ensureDataDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ password }, null, 2), "utf-8");
}