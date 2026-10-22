const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const INFOSYS_URL = 'https://career.infosys.com/jobs/jobapply?jobReferenceCode=INFSYS-EXTERNAL-254097&sourceId=4003';
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';
const F5_PATH = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

(async () => {
  let browser;
  let page;
  try {
    console.log('[Infosys Apply] Connecting to Brave...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    const pages = await browser.pages();
    // Reuse existing Infosys tab if open, else new tab
    page = pages.find(p => p.url().includes('career.infosys.com') || p.url().includes('infosysapps.com'));
    if (!page) {
      page = await browser.newPage();
    }

    await page.bringToFront();
    console.log(`[Infosys Apply] Navigating to: ${INFOSYS_URL}`);
    await page.goto(INFOSYS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    console.log('Title:', await page.title());
    console.log('Landed URL:', page.url());

    // Inspect page state
    const pageState = await page.evaluate(() => {
      const text = document.body.innerText;
      const isApplied = /already applied|application submitted|successfully applied|thank you/i.test(text);
      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]')).map(b => ({
        tag: b.tagName,
        text: (b.innerText || b.value || '').trim().replace(/\n/g, ' '),
        disabled: b.disabled || false
      }));
      return {
        snippet: text.substring(0, 500).replace(/\n+/g, ' '),
        isApplied,
        btns: btns.filter(b => b.text.length > 2)
      };
    });

    console.log('Page state:\n', JSON.stringify(pageState, null, 2));

    // Upload resume if file input present
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0 && fs.existsSync(RESUME_PATH)) {
      console.log('Uploading resume to file input...');
      for (const fi of fileInputs) {
        try { await fi.uploadFile(RESUME_PATH); } catch (e) {}
      }
      await sleep(1500);
    }

    // Look for Apply / Submit / Confirm button
    const submitBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
      const target = btns.find(b => /apply now|submit application|confirm|proceed|apply/i.test((b.innerText || b.value || '').trim()));
      if (target) {
        target.click();
        return (target.innerText || target.value).trim();
      }
      return null;
    });

    if (submitBtn) {
      console.log(`Clicked button: "${submitBtn}"`);
      await sleep(4000);
    }

    // Take post-action screenshot
    const ssPath = path.join(SCREENSHOT_DIR, 'infosys_senior_systems_engineer_applied.png');
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`Screenshot saved to: ${ssPath}`);

    // Check confirmation
    const finalState = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        confirmed: text.includes('successfully') || text.includes('application submitted') || text.includes('registered') || text.includes('thank you') || text.includes('already applied'),
        textSnippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' ')
      };
    });

    console.log('Final state:', finalState);

    if (finalState.confirmed) {
      let f5 = JSON.parse(fs.readFileSync(F5_PATH, 'utf8'));
      f5.total += 1;
      f5.jobs.push({
        id: f5.total,
        company: 'Infosys Limited',
        role: 'Senior Systems Engineer (Employee Referral)',
        channel: 'Direct ATS Portal (Infosys Careers)',
        url: INFOSYS_URL,
        status: 'CONFIRMED_APPLIED',
        screenshot: 'screenshots/2026-10-19/shift1/infosys_senior_systems_engineer_applied.png',
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(F5_PATH, JSON.stringify(f5, null, 2), 'utf8');
      console.log(`🎉 [INFOSYS APPLIED & RECORDED]: Total today: ${f5.total}`);
    }

  } catch (err) {
    console.error('Error applying to Infosys:', err.message);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
