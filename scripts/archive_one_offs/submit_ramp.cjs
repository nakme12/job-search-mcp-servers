const puppeteer = require('puppeteer-core');
const path = require('path');
const { getScreenshotsVault } = require('./canonical_paths.cjs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('ashbyhq.com'));
  if (!page) {
    console.log('No Ashby page found');
    process.exit(1);
  }

  console.log('[Ramp] Page URL:', page.url());

  // 1. Fill Radio/Checkboxes for questions
  const selectionSummary = await page.evaluate(() => {
    const summary = [];
    
    // Authorization buttons: Yes / No
    const btns = Array.from(document.querySelectorAll('button'));
    const authBtn = btns.find(b => {
      const p = b.closest('div, fieldset');
      return p && p.innerText.includes('authorized to work in the U.S.') && b.innerText.trim() === 'No';
    });
    if (authBtn) {
      authBtn.click();
      summary.push('Work Auth: Clicked No');
    }

    // Country of residence -> 'Other'
    // Pronouns -> 'He/His'
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    cbs.forEach(cb => {
      const container = cb.closest('div, fieldset');
      const cText = (container?.innerText || '').toLowerCase();
      const lText = (cb.closest('label')?.innerText || cb.name || '').toLowerCase();

      if (cText.includes('country of residence') && (lText.includes('other') || cb.name === 'Other')) {
        if (!cb.checked) {
          cb.click();
          summary.push('Country of Residence: Checked Other');
        }
      }
      if (cText.includes('pronouns') && (lText.includes('he/his') || cb.name === 'He/His')) {
        if (!cb.checked) {
          cb.click();
          summary.push('Pronouns: Checked He/His');
        }
      }
    });

    return summary;
  });

  console.log('[Ramp] Option Selections:', selectionSummary);

  // Wait a moment for React state to register
  await new Promise(r => setTimeout(r, 1000));

  // Check if Submit button is enabled
  const submitInfo = await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"], .ashby-application-form-submit-button');
    if (!btn) return { exists: false };
    return {
      exists: true,
      text: btn.innerText.trim(),
      disabled: btn.disabled,
      className: btn.className
    };
  });
  console.log('[Ramp] Submit Button State:', submitInfo);

  // Click Submit Application
  const submitBtn = await page.$('button[type="submit"], .ashby-application-form-submit-button');
  if (submitBtn) {
    console.log('[Ramp] Clicking Submit Application...');
    await submitBtn.click();
  }

  // Wait 4-5 seconds and check confirmation
  await new Promise(r => setTimeout(r, 5000));

  const afterState = await page.evaluate(() => {
    const text = document.body.innerText;
    const isSubmitted = text.includes('Thank you') || 
                        text.includes('Application submitted') || 
                        text.includes('submitted successfully') || 
                        text.includes('We have received your application');
    const errors = Array.from(document.querySelectorAll('[class*="error"], [class*="invalid"], [role="alert"]'))
                        .map(e => e.innerText?.trim())
                        .filter(t => t && t.length > 0);
    return { isSubmitted, errors, snippet: text.slice(0, 300).replace(/\s+/g, ' ') };
  });

  console.log('[Ramp] After Submit State:', afterState);

  // Take screenshot in canonical vault
  const vaultDir = getScreenshotsVault();
  const ssPath = path.join(vaultDir, `post_submit_ramp_${Date.now()}.png`);
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log('[Ramp] Screenshot captured:', ssPath);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
