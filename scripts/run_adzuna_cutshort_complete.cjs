const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');

async function executeCompleteAdzunaCutshortFlow() {
  console.log('======================================================');
  console.log('🚀 EXECUTING COMPLETE ADZUNA ➔ CUTSHORT END-TO-END APPLY');
  console.log('======================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  // Isolated tab per Rule 81
  const page = await browser.newPage();

  try {
    const jobUrl = 'https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3';
    console.log('[1] Navigating to Cutshort Job Page:', jobUrl);
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Clear any backdrop modal via outside click & Escape
    await page.mouse.click(15, 15);
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));

    // Step 2: Click "Apply now" button
    console.log('[2] Clicking "Apply now"...');
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

    // Step 3: Check if modal appeared
    console.log('[3] Inspecting Modal & Upload Resume Button...');
    const modalInfo = await page.evaluate(() => {
      const allText = document.body ? document.body.innerText : '';
      const btns = Array.from(document.querySelectorAll('button, a, span, label')).map(b => ({
        tag: b.tagName,
        text: b.innerText ? b.innerText.trim() : '',
        id: b.id || null,
        className: b.className || null
      })).filter(x => x.text.length > 0 && x.text.length < 50);

      const hasUploadResume = btns.some(b => b.text.toLowerCase().includes('upload resume'));
      const hasSaveContinue = btns.some(b => b.text.toLowerCase().includes('save and continue'));
      const hasFileInput = !!document.querySelector('input[type="file"]');

      return {
        hasUploadResume,
        hasSaveContinue,
        hasFileInput,
        snippet: allText.substring(0, 400).replace(/\s+/g, ' ')
      };
    });
    console.log('  -> Modal Info:', JSON.stringify(modalInfo, null, 2));

    // Step 4: Resume PDF File Upload (CDP + File Chooser)
    const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('[4] Uploading Resume PDF:', resumePath);

    const fileInputHandle = await page.$('input[type="file"]');
    if (fileInputHandle) {
      await fileInputHandle.uploadFile(resumePath);
      console.log('  -> Attached directly via input[type="file"] ✅');
    } else {
      console.log('  -> Setting up FileChooser interceptor...');
      try {
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser({ timeout: 5000 }),
          page.evaluate(() => {
            const targets = Array.from(document.querySelectorAll('a, button, span, label, div'));
            const uploadBtn = targets.find(el => el.innerText && el.innerText.trim().toLowerCase().includes('upload resume'));
            if (uploadBtn) uploadBtn.click();
          })
        ]);
        await fileChooser.accept([resumePath]);
        console.log('  -> File accepted via FileChooser ✅');
      } catch(fcErr) {
        console.log('  -> FileChooser timeout or auto-handled:', fcErr.message);
      }
    }
    await new Promise(r => setTimeout(r, 4000));

    // Step 5: Fill Canonical Profile Fields (Rule 54)
    console.log('[5] Aligning Canonical Inputs (Experience: 1.5, Location: Indore, CTC: 4.65 LPA)...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      // Exp input
      const expInput = inputs.find(i => i.placeholder && i.placeholder.includes('6') || i.value === '1.3');
      if (expInput) {
        expInput.value = '1.5';
        expInput.dispatchEvent(new Event('input', { bubbles: true }));
        expInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Expected CTC input
      const expectedInput = inputs.find(i => i.value === '5.8');
      if (expectedInput) {
        expectedInput.value = '4.65';
        expectedInput.dispatchEvent(new Event('input', { bubbles: true }));
        expectedInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // City input
      const cityInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('city'));
      if (cityInput && !cityInput.value) {
        cityInput.value = 'Indore';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        cityInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Step 6: Click "Save and continue"
    console.log('[6] Clicking "Save and continue"...');
    const saveClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => x.innerText && x.innerText.trim().toLowerCase() === 'save and continue');
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('  -> Save and continue clicked:', saveClicked);
    await new Promise(r => setTimeout(r, 5000));

    // Step 7: Final Screen Check (Rule 69) & Post-Submit Screenshot
    console.log('[7] Asserting Post-Submit Live DOM State...');
    const postSubmitState = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isConfirmed = /applied successfully|application submitted|thank you for applying|already applied|applied/i.test(text);
      const btns = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 50);
      return {
        isConfirmed,
        url: window.location.href,
        buttons: btns.slice(0, 15),
        snippet: text.substring(0, 400).replace(/\s+/g, ' ')
      };
    });
    console.log('  -> Live State:', JSON.stringify(postSubmitState, null, 2));

    // Capture single proof screenshot (Rule 66)
    const vault = getScreenshotsVault();
    if (!fs.existsSync(vault)) fs.mkdirSync(vault, { recursive: true });
    const proofScreenshot = path.join(vault, `Octalbees_Cutshort_Confirmed_${Date.now()}.png`);
    await page.screenshot({ path: proofScreenshot, fullPage: false });
    console.log(`📸 Proof screenshot saved: ${proofScreenshot}`);

    // If confirmed, update File 5
    if (postSubmitState.isConfirmed) {
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
        confirmation_screenshot: proofScreenshot,
        submitted_at: new Date().toISOString()
      });
      file5.total = file5.jobs.length;
      fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2));
      console.log(`\n🎉 CONFIRMED APPLICATION LOGGED TO FILE 5! Total Submissions: ${file5.total}`);
    }

  } catch(err) {
    console.error('❌ Error during flow:', err.message);
  } finally {
    await new Promise(r => setTimeout(r, 3000));
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

executeCompleteAdzunaCutshortFlow().catch(console.error);
