const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { CANONICAL_PATHS } = require('./canonical_paths.cjs');

async function uploadDashboardResume() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    console.log('[1] Navigating to Candidate Dashboard...');
    await page.goto('https://cutshort.io/profile/candidate-dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('[2] Authorized Resume Path:', resumePath);

    console.log('[3] Setting up FileChooser on Update resume click...');
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 10000 }),
      page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Update resume');
        if (btn) btn.click();
      })
    ]);

    console.log('[4] FileChooser detected! Uploading file...');
    await fileChooser.accept([resumePath]);
    console.log('[5] Resume accepted! Waiting 8s for upload to process...');
    await new Promise(r => setTimeout(r, 8000));

    const text = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 500).replace(/\s+/g, ' ') : '');
    console.log('[6] Dashboard status:', text);

  } catch (e) {
    console.error('Error uploading resume:', e.message);
  } finally {
    await page.close();
    browser.disconnect();
  }
}

uploadDashboardResume().catch(console.error);
