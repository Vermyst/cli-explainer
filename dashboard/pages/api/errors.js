/**
 * pages/api/errors.js
 * Reads the local SQLite database and returns all data needed by the dashboard.
 * Works both locally and on Vercel (if DB is available via network or copied).
 */

import path from "path";
import fs from "fs";

// We use better-sqlite3 for sync reads — much simpler for an API route
let Database;
try {
  Database = require("better-sqlite3");
} catch {
  Database = null;
}

// Try to locate the database file
function findDbPath() {
  const candidates = [
    process.env.CLI_EXPLAINER_DB,                          // env override
    path.join(process.cwd(), "..", ".cli_explainer.db"),   // repo root (local dev)
    path.join(process.env.HOME || "~", ".cli_explainer.db"), // home dir fallback
    path.join(process.cwd(), ".cli_explainer.db"),         // cwd fallback
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getMockData() {
  // Realistic mock data for Vercel preview / when DB isn't available
  const now = Date.now();
  const day = 86400000;

  return {
    summary: {
      total: 147,
      unique: 38,
      successRate: 82,
      timeSavedMinutes: 294,
    },
    recentErrors: [
      { id: 9, command: "git push origin main", exit_code: 128, explanation: "Authentication failed — your GitHub token expired.", fix: "gh auth login", worked: 1, created_at: new Date(now - 5 * 60000).toISOString() },
      { id: 8, command: "npm run build", exit_code: 1, explanation: "TypeScript found a type mismatch in your component props.", fix: "Check the error above and fix the type in the indicated file.", worked: null, created_at: new Date(now - 32 * 60000).toISOString() },
      { id: 7, command: "python3 app.py", exit_code: 1, explanation: "ModuleNotFoundError: the 'requests' package isn't installed in this environment.", fix: "pip install requests", worked: 1, created_at: new Date(now - 2 * day).toISOString() },
      { id: 6, command: "docker-compose up", exit_code: 1, explanation: "Port 5432 is already in use — another Postgres instance is running.", fix: "lsof -i :5432 | grep LISTEN | awk '{print $2}' | xargs kill", worked: 0, created_at: new Date(now - 2 * day - 3600000).toISOString() },
      { id: 5, command: "git merge feature/auth", exit_code: 1, explanation: "Merge conflict in package-lock.json that Git couldn't auto-resolve.", fix: "git checkout --theirs package-lock.json && npm install", worked: 1, created_at: new Date(now - 3 * day).toISOString() },
      { id: 4, command: "cargo build", exit_code: 101, explanation: "Rust couldn't find the 'serde' crate — it's missing from Cargo.toml.", fix: "cargo add serde --features derive", worked: 1, created_at: new Date(now - 4 * day).toISOString() },
      { id: 3, command: "ssh user@192.168.1.10", exit_code: 255, explanation: "Connection refused — the remote host isn't reachable on port 22.", fix: "ping 192.168.1.10 to verify it's up, then check sshd is running.", worked: null, created_at: new Date(now - 4 * day - 7200000).toISOString() },
      { id: 2, command: "npm install", exit_code: 1, explanation: "EACCES: permission denied writing to node_modules — a prior sudo npm broke ownership.", fix: "sudo chown -R $(whoami) ~/.npm && npm install", worked: 1, created_at: new Date(now - 5 * day).toISOString() },
    ],
    topErrors: [
      { command: "git push origin main", count: 24, successRate: 96 },
      { command: "npm run build",        count: 18, successRate: 72 },
      { command: "python3 app.py",       count: 15, successRate: 80 },
      { command: "docker-compose up",    count: 12, successRate: 58 },
      { command: "npm install",          count: 11, successRate: 91 },
      { command: "cargo build",          count: 8,  successRate: 88 },
      { command: "ssh",                  count: 6,  successRate: 50 },
      { command: "git merge",            count: 5,  successRate: 100 },
    ],
    dailyErrors: [
      { date: new Date(now - 6 * day).toLocaleDateString("en-US", { weekday: "short" }), count: 8 },
      { date: new Date(now - 5 * day).toLocaleDateString("en-US", { weekday: "short" }), count: 14 },
      { date: new Date(now - 4 * day).toLocaleDateString("en-US", { weekday: "short" }), count: 6 },
      { date: new Date(now - 3 * day).toLocaleDateString("en-US", { weekday: "short" }), count: 19 },
      { date: new Date(now - 2 * day).toLocaleDateString("en-US", { weekday: "short" }), count: 11 },
      { date: new Date(now - 1 * day).toLocaleDateString("en-US", { weekday: "short" }), count: 7 },
      { date: "Today", count: 3 },
    ],
    isMock: true,
  };
}

export default function handler(req, res) {
  if (!Database) {
    return res.status(200).json(getMockData());
  }

  const dbPath = findDbPath();
  if (!dbPath) {
    return res.status(200).json(getMockData());
  }

  try {
    const db = new Database(dbPath, { readonly: true });

    // Summary stats
    const total       = db.prepare("SELECT COUNT(*) as n FROM history").get().n;
    const unique      = db.prepare("SELECT COUNT(DISTINCT error_hash) as n FROM history").get().n;
    const rated       = db.prepare("SELECT COUNT(*) as n FROM history WHERE worked IS NOT NULL").get().n;
    const successes   = db.prepare("SELECT COUNT(*) as n FROM history WHERE worked = 1").get().n;
    const successRate = rated > 0 ? Math.round((successes / rated) * 100) : 0;

    // Estimate 2 minutes saved per explanation vs searching manually
    const timeSavedMinutes = total * 2;

    // Recent errors (last 50)
    const recentErrors = db.prepare(`
      SELECT id, command, exit_code, explanation, fix, worked, created_at
      FROM history
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    // Top errors by frequency
    const topErrors = db.prepare(`
      SELECT
        TRIM(SUBSTR(command, 1, INSTR(command || ' ', ' ') - 1)) as command,
        SUM(used_count) as count,
        ROUND(
          100.0 * SUM(CASE WHEN worked = 1 THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN worked IS NOT NULL THEN 1 ELSE 0 END), 0)
        ) as successRate
      FROM history
      GROUP BY LOWER(TRIM(SUBSTR(command, 1, INSTR(command || ' ', ' ') - 1)))
      ORDER BY count DESC
      LIMIT 8
    `).all();

    // Errors per day (last 7 days)
    const dailyErrors = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM history
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    db.close();

    return res.status(200).json({
      summary: { total, unique, successRate, timeSavedMinutes },
      recentErrors,
      topErrors,
      dailyErrors,
      isMock: false,
    });

  } catch (err) {
    console.error("DB read error:", err);
    return res.status(200).json(getMockData());
  }
}
