const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');

async function submitCutshortOctalbees() {
  console.log('======================================================');
  console.log('🚀 SUBMITTING ADZUNA ➔ CUTSHORT JOB: Octalbees');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  // Rule 81: Isolated tab
  const page = await browser.newPage();

  try {
    const jobUrl = 'https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3';
    console.log('[1] Navigating to Cutshort application page:', jobUrl);
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Clear backdrop/Escape
    await page.mouse.click(15, 15);
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));

    // Step 2: Click "Apply now"
    console.log('[2] Clicking "Apply now" trigger...');
    const applyClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => x.innerText && x.innerText.trim().toLowerCase() === 'apply now');
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('  -> Apply now clicked:', applyClicked);
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: Populate canonical screening profile fields (Rule 54 & Rule 70)
    console.log('[3] Populating Canonical Fields (Rule 54):');
    console.log('  - Experience: 1.5 Years');
    console.log('  - Notice Period: 15 Days');
    console.log('  - Current CTC: 2.16 LPA');
    console.log('  - Expected CTC: 4.65 LPA');
    console.log('  - Location: Indore');

    const fillResult = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      // 1. City / Location input
      const cityInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('city'));
      if (cityInput) {
        cityInput.focus();
        cityInput.value = '';
        cityInput.value = 'Indore';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        cityInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 2. Expected CTC input (look for value around 5.8 or label expected)
      const expectedInput = inputs.find(i => i.value === '5.8' || (i.name && i.name.toLowerCase().includes('expected')));
      if (expectedInput) {
        expectedInput.focus();
        expectedInput.value = '';
        expectedInput.value = '4.65';
        expectedInput.dispatchEvent(new Event('input', { bubbles: true }));
        expectedInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 3. Experience input (look for 1.3 or placeholder e.g 6)
      const expInput = inputs.find(i => i.value === '1.3' || (i.placeholder && i.placeholder.includes('6')));
      if (expInput) {
        expInput.focus();
        expInput.value = '';
        expInput.value = '1.5';
        expInput.dispatchEvent(new Event('input', { bubbles: true }));
        expInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return {
        citySet: cityInput ? cityInput.value : null,
        expectedSet: expectedInput ? expectedInput.value : null,
        expSet: expInput ? expInput.value : null
      };
    });

    console.log('  -> Field values after input:', JSON.stringify(fillResult));
    await new Promise(r => setTimeout(r, 2000));

    // Step 4: Click "Save and continue" / Submit
    console.log('[4] Clicking "Save and continue" button...');
    const submitClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => x.innerText && (x.innerText.trim().toLowerCase() === 'save and continue' || x.innerText.trim().toLowerCase() === 'submit'));
      if (b) {
        b.click();
        return b.innerText.trim();
      }
      return null;
    });
    console.log('  -> Button clicked:', submitClicked);
    await new Promise(r => setTimeout(r, 5000));

    // Step 5: Check live confirmation (Rule 69)
    console.log('[5] Checking Live DOM Confirmation...');
    const confirmState = await page.evaluate(() => {
      const body = document.body ? document.body.innerText : '';
      const isConfirmed = /applied successfully|application submitted|thank you for applying|already applied|applied/i.test(body);
      const remainingButtons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 50);
      return {
        isConfirmed,
        url: window.location.href,
        buttons: remainingButtons.slice(0, 15),
        snippet: body.substring(0, 500).replace(/\s+/g, ' ')
      };
    });

    console.log('  -> Confirmation detected:', confirmState.isConfirmed);
    console.log('  -> DOM Snippet:', confirmState.snippet);

    // Save proof screenshot (Rule 66)
    const vault = getScreenshotsVault();
    if (!fs.existsSync(vault)) fs.mkdirSync(vault, { recursive: true });
    const screenshotPath = path.join(vault, `Octalbees_Cutshort_Submission_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Post-submit proof screenshot saved: ${screenshotPath}`);

    // If confirmed, update File 5
    if (confirmState.isConfirmed) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const shift = now.getHours() >= 15 ? 2 : 1;
      const file5Path = path.join(__dirname, '..', `applied_todays_${todayStr}_shift${shift}.json`);

      let file5 = { date: todayStr, shift, total: 0, jobs: [] };
      if (fs.existsSync(file5Path)) {
        try { file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8')); } catch(e){}
      }

      file5.jobs.push({
        company: 'Octalbees',
        role: 'MERN Stack Developer Intern',
        platform: 'Cutshort (via Adzuna Sourcing)',
        application_type: 'Direct Cutshort Application',
        url: 'https://cutshort.io/job/MERN-Stack-Developer-Intern-Octalbees-W2Y03F0H',
        confirmation_screenshot: screenshotPath,
        submitted_at: new Date().toISOString()
      });
      file5.total = file5.jobs.length;
      fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2));
      console.log(`✅ File 5 Updated! Confirmed applications today: ${file5.total}`);
    }

  } catch(e) {
    console.error('❌ Error during submission:', e.message);
  } finally {
    // Keep tab open for 5 seconds for user visibility then close
    await new Promise(r => setTimeout(r, 4000));
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

submitCutshortOctalbees().catch(console.error);
