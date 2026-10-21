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

  console.log('[Ramp] Clicking .ashby-application-form-submit-button directly...');
  const submitBtn = await page.$('button.ashby-application-form-submit-button');
  if (!submitBtn) {
    console.log('Submit button not found by class');
    process.exit(1);
  }

  // Scroll into view
  await submitBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await new Promise(r => setTimeout(r, 800));

  // Click it
  await submitBtn.click();
  console.log('[Ramp] Clicked submit button!');

  // Wait 6 seconds
  await new Promise(r => setTimeout(r, 6000));

  const status = await page.evaluate(() => {
    const text = document.body.innerText;
    const isSubmitted = text.includes('Thank you') || 
                        text.includes('Application submitted') || 
                        text.includes('submitted successfully') || 
                        text.includes('received your application');
    const errors = Array.from(document.querySelectorAll('div, span, p'))
      .filter(el => el.className && typeof el.className === 'string' && el.className.includes('error'))
      .map(el => el.innerText?.trim())
      .filter(t => t && t.length > 0 && t.length < 100);

    return {
      isSubmitted,
      url: window.location.href,
      errors: [...new Set(errors)],
      headerSnippet: text.slice(0, 200).replace(/\s+/g, ' ')
    };
  });

  console.log('[Ramp] Live Status:', JSON.stringify(status, null, 2));

  // Save screenshot in canonical vault
  const vaultDir = getScreenshotsVault();
  const filename = status.isSubmitted ? `post_submit_ramp_${Date.now()}.png` : `status_ramp_${Date.now()}.png`;
  const ssPath = path.join(vaultDir, filename);
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log('[Ramp] Screenshot saved:', ssPath);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
