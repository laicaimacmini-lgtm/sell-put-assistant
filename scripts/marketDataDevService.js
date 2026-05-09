#!/usr/bin/env node
/**
 * Background dev service manager for MarketData.app local dev mode.
 * Manages Express proxy (port 8787) + Vite dev server (port 5173).
 *
 * Usage:
 *   node scripts/marketDataDevService.js start|stop|restart|status|logs
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(PROJECT_ROOT, '.runtime');
const LOG_FILE = path.join(RUNTIME_DIR, 'marketdata-dev.log');
const SERVER_PID_FILE = path.join(RUNTIME_DIR, 'server.pid');
const VITE_PID_FILE = path.join(RUNTIME_DIR, 'vite.pid');

const SERVER_PORT = 8787;
const VITE_PORT = 5173;

// ── helpers ─────────────────────────────────────────────────────────────────

function ensureRuntimeDir() {
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function writePid(file, pid) {
  fs.writeFileSync(file, String(pid), 'utf8');
}

function readPid(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    return parseInt(raw, 10) || null;
  } catch {
    return null;
  }
}

function removePid(file) {
  try { fs.unlinkSync(file); } catch { /* ignore */ }
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPid(pid) {
  if (!pid) return;
  try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
}

function portListening(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));
    socket.connect(port, '127.0.0.1');
  });
}

function appendLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

function log(msg) {
  console.log(msg);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── start ────────────────────────────────────────────────────────────────────

async function start() {
  ensureRuntimeDir();

  const serverPid = readPid(SERVER_PID_FILE);
  const vitePid = readPid(VITE_PID_FILE);

  if (isRunning(serverPid) && isRunning(vitePid)) {
    log('MarketData dev service is already running.');
    await status();
    return;
  }

  // Clean up stale pids
  if (!isRunning(serverPid)) removePid(SERVER_PID_FILE);
  if (!isRunning(vitePid)) removePid(VITE_PID_FILE);

  const logFd = fs.openSync(LOG_FILE, 'a');
  appendLog('=== start ===');

  // ── Express server ──────────────────────────────────────────────────────────
  const serverEnv = {
    ...process.env,
    OPTIONS_DATA_PROVIDER: 'marketdata',
  };

  appendLog(`Starting server with OPTIONS_DATA_PROVIDER=marketdata on port ${SERVER_PORT}`);

  const server = spawn('node', ['server/index.js'], {
    cwd: PROJECT_ROOT,
    env: serverEnv,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  server.unref();
  writePid(SERVER_PID_FILE, server.pid);
  appendLog(`server.pid = ${server.pid}`);

  // ── Vite dev server ─────────────────────────────────────────────────────────
  const viteEnv = {
    ...process.env,
    VITE_OPTIONS_API_BASE: `http://localhost:${SERVER_PORT}`,
  };

  appendLog(`Starting Vite on port ${VITE_PORT} bound to 127.0.0.1`);

  // Use npm run dev so node_modules/.bin is in PATH for vite
  const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(VITE_PORT)], {
    cwd: PROJECT_ROOT,
    env: viteEnv,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    shell: false,
  });
  vite.unref();
  writePid(VITE_PID_FILE, vite.pid);
  appendLog(`vite.pid = ${vite.pid}`);

  fs.closeSync(logFd);

  log(`Server PID: ${server.pid}  |  Vite PID: ${vite.pid}`);
  log('Waiting 8 seconds for services to start...');

  await sleep(8000);

  const s8787 = await portListening(SERVER_PORT);
  const s5173 = await portListening(VITE_PORT);

  log('');
  log(`Port ${SERVER_PORT} (API proxy): ${s8787 ? '✓ listening' : '✗ not yet listening'}`);
  log(`Port ${VITE_PORT} (Vite):       ${s5173 ? '✓ listening' : '✗ not yet listening'}`);
  log('');
  log('──────────────────────────────────────────────────────────');
  log('SSH tunnel (run on your LOCAL machine):');
  log('  ssh -L 5173:127.0.0.1:5173 -L 8787:127.0.0.1:8787 mac2');
  log('');
  log('Browser (on your local machine):');
  log('  http://localhost:5173/sell-put-assistant/');
  log('──────────────────────────────────────────────────────────');
  log('');
  log('Use  npm run bg:marketdata:logs    to tail the log');
  log('Use  npm run bg:marketdata:status  to check process health');
  log('Use  npm run bg:marketdata:stop    to shut down');
}

// ── stop ─────────────────────────────────────────────────────────────────────

async function stop() {
  let stopped = false;

  const serverPid = readPid(SERVER_PID_FILE);
  const vitePid = readPid(VITE_PID_FILE);

  if (isRunning(serverPid)) {
    log(`Stopping server (pid ${serverPid})...`);
    killPid(serverPid);
    stopped = true;
  } else if (serverPid) {
    log(`server.pid ${serverPid} was stale — already gone`);
  }
  removePid(SERVER_PID_FILE);

  if (isRunning(vitePid)) {
    log(`Stopping Vite (pid ${vitePid})...`);
    killPid(vitePid);
    stopped = true;
  } else if (vitePid) {
    log(`vite.pid ${vitePid} was stale — already gone`);
  }
  removePid(VITE_PID_FILE);

  if (!stopped) {
    log('No running processes found via pid files.');
  }

  await sleep(2000);
  const s8787 = await portListening(SERVER_PORT);
  const s5173 = await portListening(VITE_PORT);
  log(`Port ${SERVER_PORT}: ${s8787 ? 'still in use' : 'released'}`);
  log(`Port ${VITE_PORT}: ${s5173 ? 'still in use' : 'released'}`);

  if (s8787 || s5173) {
    log('Warning: port(s) still in use. Identify the process with: lsof -ti tcp:5173  or  lsof -ti tcp:8787');
  }

  if (stopped) appendLog('=== stop ===');
}

// ── status ───────────────────────────────────────────────────────────────────

async function status() {
  const serverPid = readPid(SERVER_PID_FILE);
  const vitePid = readPid(VITE_PID_FILE);
  const s8787 = await portListening(SERVER_PORT);
  const s5173 = await portListening(VITE_PORT);

  log('');
  log('── MarketData Dev Service Status ──────────────────────────');
  log(`  Server (port ${SERVER_PORT}): pid ${serverPid || 'none'} — ${isRunning(serverPid) ? '✓ running' : '✗ not running'}`);
  log(`  Vite   (port ${VITE_PORT}): pid ${vitePid || 'none'} — ${isRunning(vitePid) ? '✓ running' : '✗ not running'}`);
  log(`  Port ${SERVER_PORT} listening:  ${s8787 ? 'yes' : 'no'}`);
  log(`  Port ${VITE_PORT} listening:  ${s5173 ? 'yes' : 'no'}`);
  log('──────────────────────────────────────────────────────────');

  if (fs.existsSync(LOG_FILE)) {
    log('Recent log (last 20 lines):');
    try {
      const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
      const recent = lines.slice(-20);
      recent.forEach(l => {
        // Redact lines that look like they might contain a token
        if (/token|secret/i.test(l) && /[A-Za-z0-9]{20,}/.test(l)) {
          log('  [line redacted]');
        } else {
          log('  ' + l);
        }
      });
    } catch {
      log('  (could not read log)');
    }
  } else {
    log('No log file yet. Run  npm run bg:marketdata:start  first.');
  }
  log('');
}

// ── logs ─────────────────────────────────────────────────────────────────────

function logs() {
  if (!fs.existsSync(LOG_FILE)) {
    log('No log file found. Run  npm run bg:marketdata:start  first.');
    return;
  }
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
  const recent = lines.slice(-100);
  recent.forEach(l => {
    if (/token|secret/i.test(l) && /[A-Za-z0-9]{20,}/.test(l)) {
      console.log('[line redacted]');
    } else {
      console.log(l);
    }
  });
}

// ── restart ──────────────────────────────────────────────────────────────────

async function restart() {
  log('Restarting MarketData dev service...');
  await stop();
  await sleep(1500);
  await start();
}

// ── main ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2];
switch (cmd) {
  case 'start':   await start();   break;
  case 'stop':    await stop();    break;
  case 'restart': await restart(); break;
  case 'status':  await status();  break;
  case 'logs':    logs();          break;
  default:
    console.error('Usage: node scripts/marketDataDevService.js start|stop|restart|status|logs');
    process.exit(1);
}
