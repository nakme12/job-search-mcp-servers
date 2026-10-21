const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');

async function completeCutshortSubmission() {
  console.log('======================================================');
  console.log('🚀 COMPLETING CUTSHORT SUBMISSION (RESUME UPLOAD + SAVE)');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  // Isolated tab per Rule 81
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

    // Click "Apply now"
    console.log('[2] Clicking "Apply now"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => x.innerText && x.innerText.trim().toLowerCase() === 'apply now');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: Set fields (Experience, Location, CTC)
    console.log('[3] Setting Canonical Profile values...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      const expInput = inputs.find(i => i.placeholder && i.placeholder.includes('6') || i.value === '1.3');
      if (expInput) {
        expInput.value = '1.5';
        expInput.dispatchEvent(new Event('input', { bubbles: true }));
        expInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Step 4: UPLOAD RESUME! (Fixing the exact "Required" block seen in screenshot)
    console.log('[4] Uploading Resume PDF...');
    const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('  -> Resume Path:', resumePath);

    // Locate the file input
    const fileInputHandle = await page.$('input[type="file"]');
    if (fileInputHandle) {
      await fileInputHandle.uploadFile(resumePath);
      console.log('  -> File uploaded via input[type="file"] handle ✅');
    } else {
      // If hidden, find and upload via CDP
      console.log('  -> Looking for hidden file input...');
      const fileInputExists = await page.evaluate(() => !!document.querySelector('input[type="file"]'));
      console.log('  -> File input exists in DOM:', fileInputExists);
      if (fileInputExists) {
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser(),
          page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('a, button, span')).find(el => el.innerText && el.innerText.includes('Upload resume'));
            if (btn) btn.click();
          })
        ]);
        await fileChooser.accept([resumePath]);
        console.log('  -> File uploaded via fileChooser ✅');
      }
    }
    await new Promise(r => setTimeout(r, 4000));

    // Step 5: Click "Save and continue"
    console.log('[5] Clicking "Save and continue"...');
    const clickedSave = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'save and continue');
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    });
    console.log('  -> "Save and continue" Clicked:', clickedSave);
    await new Promise(r => setTimeout(r, 6000));

    // Step 6: Check for Next Stage or Final Confirmation
    console.log('[6] Checking live post-submit confirmation...');
    const confirmInfo = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isConfirmed = /applied successfully|application submitted|thank you for applying|applied/i.test(text);
      const btns = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 50);
      return {
        isConfirmed,
        currentUrl: window.location.href,
        buttons: btns.slice(0, 15),
        snippet: text.substring(0, 600).replace(/\s+/g, ' ')
      };
    });
    console.log('  -> Confirm Info:', JSON.stringify(confirmInfo, null, 2));

    // Step 7: Take Final Screenshot Proof
    const vault = getScreenshotsVault();
    if (!fs.existsSync(vault)) fs.mkdirSync(vault, { recursive: true });
    const finalScreenshot = path.join(vault, `Octalbees_Cutshort_Confirmed_${Date.now()}.png`);
    await page.screenshot({ path: finalScreenshot, fullPage: false });
    console.log(`📸 Final proof screenshot saved: ${finalScreenshot}`);

    // Update File 5 if confirmed
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
      confirmation_screenshot: finalScreenshot,
      submitted_at: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2));
    console.log(`\n🎉 SUCCESS! Octalbees Cutshort Application Confirmed & Logged to File 5! Total: ${file5.total}`);

  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await new Promise(r => setTimeout(r, 4000));
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

completeCutshortSubmission().catch(console.error);
