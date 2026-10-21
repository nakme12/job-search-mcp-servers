const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().startsWith('https://79371.aidaform.com/atlantis'));

    console.log('--- REA FORM FILL EXECUTION STARTED ---');

    // 0. Dismiss banner if present
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Got it!'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // 1. Q1: In which country are you currently living?
    // Target: #field-3 textarea -> "India"
    console.log('[1/7] Setting Q1: Living Country -> India');
    await page.evaluate(() => {
      const el = document.getElementById('field-3');
      el.value = 'India';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 800));

    // 2. Q2: How many years have you lived in that country?
    // Target: name="field-4", label="I'm a local, I've lived here all my life!" (value="0")
    console.log('[2/7] Setting Q2: Years lived -> Local all my life');
    await page.evaluate(() => {
      const cb = document.querySelector('input[name="field-4"][value="0"]');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // 3. Q3: Do you have iOS Device?
    // Target: name="field-5", label="No" (value="1")
    console.log('[3/7] Setting Q3: iOS Device -> No');
    await page.evaluate(() => {
      const cb = document.querySelector('input[name="field-5"][value="1"]');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // 4. Q4: Do you have Valid Apple ID?
    // Target: name="field-7", label="No" (value="1")
    console.log('[4/7] Setting Q4: Valid Apple ID -> No');
    await page.evaluate(() => {
      const cb = document.querySelector('input[name="field-7"][value="1"]');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // 5. Q5: How fluent are you with the English language?
    // Target: name="field-8", label="Fluent" (value="1")
    console.log('[5/7] Setting Q5: English fluency -> Fluent');
    await page.evaluate(() => {
      const cb = document.querySelector('input[name="field-8"][value="1"]');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // 6. Q6: Location: In which Country and city do you reside?
    // Target: #field-9city -> Indore, #field-9state -> Madhya Pradesh, #field-9country -> India
    console.log('[6/7] Setting Q6: Location -> City: Indore, State: Madhya Pradesh, Country: India');
    await page.evaluate(() => {
      const city = document.getElementById('field-9city');
      city.value = 'Indore';
      city.dispatchEvent(new Event('input', { bubbles: true }));
      city.dispatchEvent(new Event('change', { bubbles: true }));

      const state = document.getElementById('field-9state');
      state.value = 'Madhya Pradesh';
      state.dispatchEvent(new Event('input', { bubbles: true }));
      state.dispatchEvent(new Event('change', { bubbles: true }));

      const country = document.getElementById('field-9country');
      country.value = 'India';
      country.dispatchEvent(new Event('input', { bubbles: true }));
      country.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 800));

    // 7. Q7: Baseline is the working platform for this project, have you worked on baseline before or do you have a baseline account?
    // Target: name="field-10", label="No" (value="1")
    console.log('[7/7] Setting Q7: Baseline account -> No');
    await page.evaluate(() => {
      const cb = document.querySelector('input[name="field-10"][value="1"]');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // 8. Q8: Your Signature (Canvas drawing)
    console.log('[8/8] Drawing digital signature on canvas...');
    const canvas = await page.$('canvas');
    await page.evaluate(() => {
      document.querySelector('canvas').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));

    const box = await canvas.boundingBox();
    const startX = box.x + 60;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 40, startY - 25, { steps: 5 });
    await page.mouse.move(startX + 80, startY + 20, { steps: 5 });
    await page.mouse.move(startX + 120, startY - 15, { steps: 5 });
    await page.mouse.move(startX + 160, startY + 15, { steps: 5 });
    await page.mouse.move(startX + 200, startY, { steps: 5 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 1000));

    // Inspection check of all filled fields before submitting
    const checkState = await page.evaluate(() => {
      return {
        country: document.getElementById('field-3').value,
        yearsLivedLocal: document.querySelector('input[name="field-4"][value="0"]').checked,
        iosDeviceNo: document.querySelector('input[name="field-5"][value="1"]').checked,
        validAppleIdNo: document.querySelector('input[name="field-7"][value="1"]').checked,
        englishFluent: document.querySelector('input[name="field-8"][value="1"]').checked,
        city: document.getElementById('field-9city').value,
        state: document.getElementById('field-9state').value,
        locationCountry: document.getElementById('field-9country').value,
        baselineNo: document.querySelector('input[name="field-10"][value="1"]').checked,
        errorsVisible: Array.from(document.querySelectorAll('.error-feedback')).filter(e => e.style.display !== 'none').map(e => e.innerText)
      };
    });

    console.log('--- PRE-SUBMIT VERIFIED STATE ---');
    console.log(JSON.stringify(checkState, null, 2));

    // Click Submit button
    console.log('Clicking Submit button...');
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Submit');
      if (submitBtn) {
        submitBtn.click();
      } else {
        throw new Error('Submit button not found');
      }
    });

    // Wait for submission completion / response
    console.log('Waiting for confirmation DOM state...');
    await new Promise(r => setTimeout(r, 5000));

    const postSubmitText = await page.evaluate(() => document.body.innerText);
    console.log('--- POST-SUBMIT LIVE DOM SNIPPET ---');
    console.log(postSubmitText.substring(0, 1000));

    // Save screenshot of confirmation
    const screenshotPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\aidaform_oneforma_survey_submitted.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);

    process.exit(0);
  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  }
})();
