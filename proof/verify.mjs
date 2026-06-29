import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('pomodoro-timer.html');
const URL = pathToFileURL(FILE).href;

let failures = 0;
let passed = 0;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL);

// ---- primitives (test contract) ----
const secs     = () => page.$eval('#time-remaining', e => Number(e.getAttribute('data-seconds')));
const text     = () => page.$eval('#time-remaining', e => e.textContent.trim());
const phase    = () => page.$eval('#phase', e => e.getAttribute('data-phase'));
const sessions = () => page.$eval('#session-count', e => e.getAttribute('data-value'));
const running  = () => page.$eval('#status', e => e.getAttribute('data-running'));

const start = () => page.click('#start');
const pause = () => page.click('#pause');
const reset = () => page.evaluate(() => window.pomodoro.reset());
const tick  = (n) => page.evaluate(nn => window.pomodoro.tick(nn), n);

async function setMin(work, short, long) {
  await page.fill('#work-min', String(work));
  await page.fill('#short-break-min', String(short));
  await page.fill('#long-break-min', String(long));
  // fill dispatches input/change; then reset so durations take effect
  await reset();
}

function check(cond, label, detail) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    return true;
  }
  console.log(`  ✗ ${label} — ${detail}`);
  failures++;
  return false;
}

async function scenario(num, name, fn) {
  console.log(`[${num}] ${name}`);
  const before = failures;
  await fn();
  if (failures === before) passed++;
}

// 1. Initial state
await scenario(1, 'Initial state', async () => {
  check(phase ? (await phase()) === 'work' : false, 'phase work', `got ${await phase()}`);
  check((await secs()) === 1500, 'secs 1500', `got ${await secs()}`);
  check((await sessions()) === '0', 'sessions 0', `got ${await sessions()}`);
  check((await running()) === 'false', 'running false', `got ${await running()}`);
  check((await text()) === '25:00', 'text 25:00', `got ${await text()}`);
});

// 2. Start + partial tick
await scenario(2, 'Start + partial tick', async () => {
  await start();
  check((await running()) === 'true', 'running true after start', `got ${await running()}`);
  await tick(1);
  check((await secs()) === 1499, 'secs 1499', `got ${await secs()}`);
  check((await text()) === '24:59', 'text 24:59', `got ${await text()}`);
  check((await running()) === 'true', 'still running', `got ${await running()}`);
});

// 3. Pause freezes time
await scenario(3, 'Pause freezes time', async () => {
  await pause();
  check((await running()) === 'false', 'running false after pause', `got ${await running()}`);
  await tick(100);
  check((await secs()) === 1499, 'secs unchanged 1499', `got ${await secs()}`);
});

// 4. Reset
await scenario(4, 'Reset', async () => {
  await reset();
  check((await phase()) === 'work', 'phase work', `got ${await phase()}`);
  check((await secs()) === 1500, 'secs 1500', `got ${await secs()}`);
  check((await sessions()) === '0', 'sessions 0', `got ${await sessions()}`);
  check((await running()) === 'false', 'running false', `got ${await running()}`);
});

// 5. Work -> short break
await scenario(5, 'work→short', async () => {
  await setMin(1, 1, 2);
  await start();
  await tick(60);
  check((await phase()) === 'short-break', 'phase short-break', `got ${await phase()}`);
  check((await secs()) === 60, 'secs 60', `got ${await secs()}`);
  check((await sessions()) === '1', 'sessions 1', `got ${await sessions()}`);
  check((await running()) === 'true', 'running true', `got ${await running()}`);
});

// 6. Break -> next work (no session increment)
await scenario(6, 'break→work (no increment)', async () => {
  await tick(60);
  check((await phase()) === 'work', 'phase work', `got ${await phase()}`);
  check((await secs()) === 60, 'secs 60', `got ${await secs()}`);
  check((await sessions()) === '1', 'sessions still 1', `got ${await sessions()}`);
  check((await running()) === 'true', 'running true', `got ${await running()}`);
});

// 7. Long break after 4 work sessions
await scenario(7, 'long break after 4', async () => {
  await setMin(1, 1, 2);
  await start();
  await tick(420);
  check((await phase()) === 'long-break', 'phase long-break', `got ${await phase()}`);
  check((await secs()) === 120, 'secs 120', `got ${await secs()}`);
  check((await sessions()) === '4', 'sessions 4', `got ${await sessions()}`);
});

// 8. Custom work duration via reset
await scenario(8, 'custom work duration', async () => {
  await setMin(10, 5, 15);
  check((await secs()) === 600, 'secs 600', `got ${await secs()}`);
  check((await phase()) === 'work', 'phase work', `got ${await phase()}`);
  check((await text()) === '10:00', 'text 10:00', `got ${await text()}`);
  check((await running()) === 'false', 'running false', `got ${await running()}`);
});

// 9. mm:ss formatting
await scenario(9, 'mm:ss formatting', async () => {
  await setMin(1, 1, 2);
  await start();
  await tick(11);
  check((await secs()) === 49, 'secs 49', `got ${await secs()}`);
  check((await text()) === '00:49', 'text 00:49', `got ${await text()}`);
});

await browser.close();

// ---- static checks over the file ----
console.log('[static] offline / single-file checks');
const src = readFileSync(FILE, 'utf8');
check(!/\b(?:src|href)\s*=\s*["'][^"']*https?:\/\//i.test(src), 'no external src/href URL', 'found external URL');
check(!/\bfetch\s*\(/.test(src), 'no fetch(', 'found fetch(');
check(!/XMLHttpRequest/.test(src), 'no XMLHttpRequest', 'found XMLHttpRequest');
check(/window\.pomodoro\s*=/.test(src), 'window.pomodoro assigned', 'not assigned');

const total = passed;
console.log(`\nVERIFY: ${total}/9 scenarios passed${failures ? `, ${failures} assertion(s) failed` : ''}`);
process.exit(failures === 0 && total === 9 ? 0 : 1);
