/**
 * INTERACTIVE 1-BY-1 CAPTCHA SOLVER & SUBMITTER
 * Opens target in Brave, pre-fills all fields, injects resume.
 * Alerts user on terminal to solve CAPTCHA and hit Submit.
 * Waits for Live Confirmation DOM string.
 * Once confirmed, saves post-submit screenshot & writes to File 5.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ROOT_DIR = 'C:/mcp/job-search-mcp-engine';
const queuePath = path.join(ROOT_DIR, 'pending_captcha_unique.json');
const f5Path = path.join(ROOT_DIR, 'applied_todays_2026-10-21.json');
const screenshotDir = path.join(ROOT_DIR, 'screenshots/2026-10-21/shift2');
fs.mkdirSync(screenshotDir, { recursive: true });

async function solveOneByOne() {
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  console.log(`Total Queued Portals with Captcha: ${queue.length}`);

  if (queue.length === 0) {
    console.log('No pending captcha jobs!');
    return;
  }

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  // Process First Job
  const job = queue[0];
  console.log('\n======================================================');
  console.log(`🚨 [INTERACTIVE CAPTCHA TARGET 1/${queue.length}]`);
  console.log(`Company:  ${job.company}`);
  console.log(`Role:     ${job.role}`);
  console.log(`URL:      ${job.url}`);
  console.log('======================================================');

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.bringToFront();

  console.log('Opening page in Brave...');
  await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3000);

  // Pre-fill candidate profile
  console.log('Pre-filling candidate fields in active tab...');
  await page.evaluate(() => {
    function fill(sel, val) {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    fill('input#first_name, input[name*="first_name"], input[name*="firstName"]', 'Pratik');
    fill('input#last_name, input[name*="last_name"], input[name*="lastName"]', 'Patidar');
    fill('input#email, input[name*="email"]', 'pratikpatidar7990@gmail.com');
    fill('input#phone, input[name*="phone"]', '+918269647990');
    fill('input[name*="linkedin"], input[id*="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar');
    fill('input[name*="website"], input[name*="portfolio"]', 'https://pratik-portfolio-nine-orcin.vercel.app');
    fill('input[name*="city"], input[name*="location"]', 'Indore, India');
  });

  // Inject resume
  const resumeFile = 'Pratik Patidar Resume - MERN Full Stack.pdf';
  const resumePath = path.join(ROOT_DIR, 'resumes', resumeFile);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput && fs.existsSync(resumePath)) {
    console.log(`Injecting resume: ${resumeFile}...`);
    await fileInput.uploadFile(resumePath);
    await sleep(4000);
  }

  console.log('\n🔔 USER ACTION REQUIRED IN BRAVE:');
  console.log('👉 Please tick the CAPTCHA box (and click Submit if needed) in the active Brave tab.');
  console.log('⏳ Waiting up to 60 seconds for live confirmation screen...\n');

  let isConfirmed = false;
  const startWait = Date.now();

  while (Date.now() - startWait < 60000) {
    isConfirmed = await page.evaluate(() => {
      const t = document.body.innerText.toLowerCase();
      return t.includes('thank you') || t.includes('application submitted') || t.includes('received your application') || t.includes('application sent');
    });

    if (isConfirmed) break;
    await sleep(3000);
  }

  console.log(`Live Confirmation Detected: ${isConfirmed}`);

  if (isConfirmed) {
    const cleanName = job.company.replace(/[^a-zA-Z0-9]/g, '_');
    const ssPath = path.join(screenshotDir, `${cleanName}_${Date.now()}_Confirmed.png`);
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log(`✅ Post-submit screenshot saved: ${ssPath}`);

    const f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    f5.jobs.push({
      id: `${cleanName.toLowerCase()}_${Date.now()}`,
      company: job.company,
      role: job.role,
      channel: 'Direct ATS (Greenhouse)',
      url: job.url,
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: ssPath,
      resume_used: resumeFile
    });
    f5.total = f5.jobs.length;
    f5.updated_at = new Date().toISOString();
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log(`🎉 SUCCESS: ${job.company} added to File 5!`);

    // Remove from queue
    queue.shift();
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
    await page.close();
  } else {
    console.log('⚠️ Confirmation timeout. Tab left open for user inspection.');
  }

  await browser.disconnect();
}

solveOneByOne();
