/**
 * BRAVE BROWSER CDP CONNECTION ENFORCER & LAUNCHER (Rule 65)
 * 
 * Standardized utility across all agents & automation scripts:
 * 1. Checks if Brave Browser is already alive on CDP port 9222.
 * 2. If already alive: reports connected status and lists open tabs.
 * 3. If offline:
 *    - Gracefully stops any stale brave.exe processes blocking port 9222.
 *    - Launches Brave with:
 *      "C:\Users\LENOVO\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --restore-last-session
 *    - Waits and verifies port 9222 is 100% online.
 * 
 * Usage:
 *   node scripts/ensure_brave_cdp.cjs              (Ensure & Launch if needed)
 *   node scripts/ensure_brave_cdp.cjs --check-only (Only check, do not launch)
 */

const http = require('http');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Users\\LENOVO\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const CDP_PORT = 9222;
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

function checkCdpAlive() {
  return new Promise((resolve) => {
    const req = http.get(`${CDP_URL}/json/version`, { timeout: 2000 }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const info = JSON.parse(raw);
          resolve({ alive: true, info });
        } catch (e) {
          resolve({ alive: false, error: 'Invalid JSON response' });
        }
      });
    });
    req.on('error', (err) => resolve({ alive: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ alive: false, error: 'Connection timed out' });
    });
  });
}

function getOpenTabs() {
  return new Promise((resolve) => {
    http.get(`${CDP_URL}/json/list`, { timeout: 3000 }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(raw);
          resolve(tabs.filter(t => t.type === 'page'));
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const isCheckOnly = process.argv.includes('--check-only');

  console.log(`=================================================================`);
  console.log(`🦁 BRAVE CDP CONNECTION AUDIT (PORT ${CDP_PORT})`);
  console.log(`=================================================================`);

  // 1. Initial Check
  const status = await checkCdpAlive();
  if (status.alive) {
    console.log(`✅ BRAVE CDP IS ONLINE & CONNECTED!`);
    console.log(`Browser: ${status.info.Browser}`);
    console.log(`WebSocket URL: ${status.info.webSocketDebuggerUrl}`);

    const tabs = await getOpenTabs();
    console.log(`\n📑 Live Open Tabs (${tabs.length}):`);
    tabs.forEach((t, idx) => console.log(`  ${idx + 1}. [${t.title || 'Untitled'}] -> ${t.url}`));
    console.log(`=================================================================\n`);
    process.exit(0);
  }

  console.log(`⚠️ Brave CDP is OFFLINE: ${status.error}`);

  if (isCheckOnly) {
    console.log(`(--check-only specified, not launching browser)`);
    process.exit(1);
  }

  // 2. Validate Brave Binary Exists
  if (!fs.existsSync(BRAVE_PATH)) {
    console.error(`❌ ERROR: Brave executable not found at: ${BRAVE_PATH}`);
    process.exit(1);
  }

  // 3. Gracefully stop stale brave processes if running without CDP
  console.log(`🔄 Closing existing Brave processes to free up port ${CDP_PORT}...`);
  try {
    execSync('taskkill /F /IM brave.exe /T', { stdio: 'ignore' });
    await sleep(1500);
  } catch (e) {
    // No process was running, safe to ignore
  }

  // 4. Launch Brave with Remote Debugging & Session Restore
  console.log(`🚀 Launching Brave with --remote-debugging-port=${CDP_PORT} --restore-last-session...`);
  try {
    execSync(`powershell -WindowStyle Normal -Command "Start-Process '${BRAVE_PATH}' -ArgumentList '--remote-debugging-port=${CDP_PORT}', '--restore-last-session'"`, {
      stdio: 'ignore'
    });
  } catch (e) {
    console.error('Failed to launch Brave via Start-Process:', e.message);
  }

  // 5. Poll for CDP readiness (up to 15 seconds)
  console.log(`⏳ Waiting for CDP port ${CDP_PORT} to become responsive...`);
  let connected = false;
  let finalInfo = null;

  for (let attempt = 1; attempt <= 15; attempt++) {
    await sleep(1000);
    const retry = await checkCdpAlive();
    if (retry.alive) {
      connected = true;
      finalInfo = retry.info;
      break;
    }
    process.stdout.write(`.`);
  }
  console.log('');

  if (connected) {
    console.log(`\n🎉 SUCCESS! BRAVE CDP IS NOW ONLINE & CONNECTED!`);
    console.log(`Browser: ${finalInfo.Browser}`);
    console.log(`WebSocket: ${finalInfo.webSocketDebuggerUrl}`);

    await sleep(2000); // Give tabs 2s to restore
    const tabs = await getOpenTabs();
    console.log(`\n📑 Restored Tabs (${tabs.length}):`);
    tabs.forEach((t, idx) => console.log(`  ${idx + 1}. [${t.title || 'Untitled'}] -> ${t.url}`));
    console.log(`=================================================================\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ FAILED: Port ${CDP_PORT} did not respond within 15 seconds.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
