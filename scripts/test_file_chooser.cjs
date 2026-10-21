const puppeteer = require('puppeteer-core');
const path = require('path');
const { CANONICAL_PATHS } = require('./canonical_paths.cjs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Trigger modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
    if (btn) ['mousedown', 'mouseup', 'click'].forEach(e => btn.dispatchEvent(new MouseEvent(e, { bubbles: true })));
  });
  await new Promise(r => setTimeout(r, 3000));

  const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  console.log('Testing FileChooser on Upload resume click...');

  try {
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 6000 }),
      page.evaluate(() => {
        const uploadDiv = Array.from(document.querySelectorAll('span, div')).find(el => el.innerText && el.innerText.trim() === 'Upload resume');
        if (uploadDiv) {
          ['mousedown', 'mouseup', 'click'].forEach(e => uploadDiv.dispatchEvent(new MouseEvent(e, { bubbles: true })));
        }
      })
    ]);

    console.log('FileChooser triggered successfully! Uploading file...');
    await fileChooser.accept([resumePath]);
    console.log('Resume accepted via FileChooser ✅');
    await new Promise(r => setTimeout(r, 4000));

    const checkResumeState = await page.evaluate(() => {
      const fieldset = document.querySelector('fieldset');
      return fieldset ? fieldset.innerText.replace(/\s+/g, ' ') : null;
    });
    console.log('Fieldset state after upload:', checkResumeState);

  } catch (err) {
    console.error('FileChooser failed:', err.message);
  } finally {
    await page.close();
    browser.disconnect();
  }
})();
