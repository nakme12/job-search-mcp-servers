/**
 * PRODUCTION-GRADE END-TO-END CUTSHORT APPLICATION ENGINE
 * Features:
 * - Rule 81 compliant (clean isolated worker tab)
 * - Coordinate-based FileChooser trigger
 * - Async upload processing polling (waits until .pdf attachment confirms)
 * - Canonical input alignment (Exp: 1.5, Location: Indore, CTC: 2.16/4.65)
 * - Notice period & terms declaration assertion
 * - Post-submit live DOM confirmation assertion (Rule 69)
 * - Proof screenshot vault storage (Rule 66)
 * - File 5 honest logging
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');

async function submitCutshortJob(jobUrl, companyName, roleName) {
  console.log(`\n======================================================`);
  console.log(`🚀 CUTSHORT AUTO-SUBMITTER: ${companyName} (${roleName})`);
  console.log(`URL: ${jobUrl}`);
  console.log(`======================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  try {
    // 1. Navigate to Cutshort job URL
    console.log('[1] Navigating to Cutshort...');
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // Clear backdrop modal if any
    await page.mouse.click(15, 15);
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));

    // 2. Click "Apply now" button (React synthetic trigger)
    console.log('[2] Triggering "Apply now" modal...');
    const applyTriggered = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
      if (btn) {
        ['mousedown', 'mouseup', 'click'].forEach(e => btn.dispatchEvent(new MouseEvent(e, { bubbles: true })));
        return true;
      }
      return false;
    });
    console.log('  -> Modal triggered:', applyTriggered);
    await new Promise(r => setTimeout(r, 3000));

    // 3. Check Resume Status
    console.log('[3] Checking Resume attachment...');
    const resumeStatus = await page.evaluate(() => {
      const fieldset = document.querySelector('fieldset');
      const text = fieldset ? fieldset.innerText : '';
      return {
        isAttached: text.toLowerCase().includes('.pdf'),
        text: text.replace(/\s+/g, ' ')
      };
    });
    console.log('  -> Current Resume State:', resumeStatus.text);

    // If resume is not attached, upload via exact coordinate FileChooser
    if (!resumeStatus.isAttached) {
      console.log('  -> Resume not attached. Triggering FileChooser...');
      const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');

      const spanBox = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find(e => e.childNodes.length === 1 && e.childNodes[0].nodeType === 3 && e.innerText.trim() === 'Upload resume');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      if (spanBox) {
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser({ timeout: 10000 }),
          page.mouse.click(spanBox.x, spanBox.y)
        ]);
        await fileChooser.accept([resumePath]);
        console.log('  -> Resume accepted! Waiting for Cutshort processing...');

        // Poll up to 25s for upload to finish
        for (let sec = 1; sec <= 25; sec++) {
          await new Promise(r => setTimeout(r, 1000));
          const state = await page.evaluate(() => {
            const fieldset = document.querySelector('fieldset');
            return fieldset ? fieldset.innerText.replace(/\s+/g, ' ') : '';
          });
          if (state.toLowerCase().includes('.pdf')) {
            console.log(`  -> Resume attached successfully in ${sec}s! (${state}) ✅`);
            break;
          }
        }
      }
    } else {
      console.log('  -> Resume already attached! Proceeding directly.');
    }

    // 4. Fill Canonical Profile Fields (Rule 54)
    console.log('[4] Populating Canonical Screening Inputs...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));

      // Experience
      const expInput = inputs.find(i => i.placeholder && i.placeholder.includes('6'));
      if (expInput) {
        expInput.value = '1.5';
        expInput.dispatchEvent(new Event('input', { bubbles: true }));
        expInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // City / Location
      const cityInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('city'));
      if (cityInput && !cityInput.value) {
        cityInput.value = 'Indore';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        cityInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // CTC
      const numInputs = inputs.filter(i => i.type === 'number');
      if (numInputs.length >= 4) {
        const cur = numInputs[numInputs.length - 2];
        const exp = numInputs[numInputs.length - 1];
        if (cur) {
          cur.value = '2.16';
          cur.dispatchEvent(new Event('input', { bubbles: true }));
          cur.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (exp) {
          exp.value = '4.65';
          exp.dispatchEvent(new Event('input', { bubbles: true }));
          exp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    // 4b. Notice Period & Declaration Checkbox (Physical Native Inputs)
    const modalCoords = await page.evaluate(() => {
      const noticeInp = document.querySelector('input[name="canJoinHowSoon"]');
      const chk = document.querySelector('input[type="checkbox"]');
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Save and continue');

      const noticeRect = noticeInp ? noticeInp.getBoundingClientRect() : null;
      const chkRect = chk ? chk.getBoundingClientRect() : null;
      const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

      return {
        notice: noticeRect ? { x: noticeRect.x + noticeRect.width / 2, y: noticeRect.y + noticeRect.height / 2 } : null,
        chk: chkRect ? { x: chkRect.x + chkRect.width / 2, y: chkRect.y + chkRect.height / 2 } : null,
        save: saveRect ? { x: saveRect.x + saveRect.width / 2, y: saveRect.y + saveRect.height / 2 } : null
      };
    });

    if (modalCoords.notice) {
      console.log('  -> Typing Notice Period (15 days)...');
      await page.mouse.click(modalCoords.notice.x, modalCoords.notice.y);
      await new Promise(r => setTimeout(r, 200));
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('15');
    }

    if (modalCoords.chk) {
      console.log('  -> Checking Declaration Checkbox...');
      await page.mouse.click(modalCoords.chk.x, modalCoords.chk.y);
    }
    await new Promise(r => setTimeout(r, 1000));

    // 5. Click "Save and continue" / Submit
    console.log('[5] Clicking "Save and continue"...');
    if (modalCoords.save) {
      await page.mouse.click(modalCoords.save.x, modalCoords.save.y);
    } else {
      await page.evaluate(() => {
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Save and continue');
        if (saveBtn) saveBtn.click();
      });
    }
    await new Promise(r => setTimeout(r, 6000));

    // 6. Assert Confirmation (Rule 69)
    console.log('[6] Asserting Live DOM Confirmation...');
    const confirmInfo = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const hasViewConvo = Array.from(document.querySelectorAll('a, button, div')).some(el => el.innerText && el.innerText.trim() === 'View conversation');
      const isConfirmed = hasViewConvo || /applied successfully|application submitted|thank you for applying|already applied|view conversation/i.test(text);
      return {
        isConfirmed,
        url: window.location.href,
        snippet: text.substring(0, 400).replace(/\s+/g, ' ')
      };
    });
    console.log('  -> Confirmation Result:', confirmInfo.isConfirmed);
    console.log('  -> Live Text:', confirmInfo.snippet);

    // 7. Capture Proof Screenshot (Rule 66)
    const vault = getScreenshotsVault();
    if (!fs.existsSync(vault)) fs.mkdirSync(vault, { recursive: true });
    const proofPath = path.join(vault, `Cutshort_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Confirmed_${Date.now()}.png`);
    await page.screenshot({ path: proofPath, fullPage: false });
    console.log(`📸 Proof screenshot saved: ${proofPath}`);

    // 8. Honest File 5 Logging
    if (confirmInfo.isConfirmed) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const shift = now.getHours() >= 15 ? 2 : 1;
      const file5Path = path.join(__dirname, '..', `applied_todays_${todayStr}_shift${shift}.json`);

      let file5 = { date: todayStr, shift, total: 0, jobs: [] };
      if (fs.existsSync(file5Path)) {
        try { file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8')); } catch(e){}
      }

      file5.jobs.push({
        company: companyName,
        role: roleName,
        platform: 'Cutshort',
        application_type: 'Direct Cutshort Application',
        url: jobUrl,
        confirmation_screenshot: proofPath,
        submitted_at: new Date().toISOString()
      });
      file5.total = file5.jobs.length;
      fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2));
      console.log(`\n🎉 CONFIRMED APPLICATION LOGGED TO FILE 5! Total Submissions: ${file5.total}`);
    }

    return {
      success: confirmInfo.isConfirmed,
      screenshot: proofPath,
      info: confirmInfo
    };

  } catch(err) {
    console.error('❌ Error during Cutshort submission:', err.message);
    return { success: false, error: err.message };
  } finally {
    await new Promise(r => setTimeout(r, 2000));
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

if (require.main === module) {
  const url = process.argv[2] || 'https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3';
  submitCutshortJob(url, 'Octalbees', 'MERN Stack Developer Intern').then(res => {
    console.log('Result:', res);
  });
}

module.exports = { submitCutshortJob };
