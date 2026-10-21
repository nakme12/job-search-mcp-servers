import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found');
      return;
    }

    // 1. Fill Email ID
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const emailInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('email'));
      if (emailInput) {
        emailInput.value = 'patidarpratik0099@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 2. Select Gender dropdown (Click custom dropdown or select)
    await page.evaluate(() => {
      // Find element containing "Select Gender"
      const allElements = Array.from(document.querySelectorAll('*'));
      const genderBox = allElements.find(el => el.children.length === 0 && (el.innerText || '').trim() === 'Select Gender');
      if (genderBox && genderBox.parentElement) {
        genderBox.parentElement.click();
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Click Male from opened dropdown list
    await page.evaluate(() => {
      const allItems = Array.from(document.querySelectorAll('li, div, a, span'));
      const maleItem = allItems.find(el => el.children.length === 0 && (el.innerText || '').trim().toLowerCase() === 'male');
      if (maleItem) {
        maleItem.click();
      }
    });

    // 3. Close the Locality autocomplete popup by selecting or clicking outside
    await page.evaluate(() => {
      const locOptions = Array.from(document.querySelectorAll('li, div'));
      const indoreLoc = locOptions.find(el => (el.innerText || '').trim() === 'Vijay Nagar' || (el.innerText || '').includes('Indore'));
      if (indoreLoc) {
        indoreLoc.click();
      } else {
        const body = document.querySelector('body');
        if (body) body.click();
      }
    });

    // 4. Set experience to 1 Year (fix the 21 Years accident)
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        for (const o of s.options) {
          if (o.value === '1' || o.text.trim() === '1 Year') {
            s.value = o.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
      // If custom dropdown for experience:
      const expBoxes = Array.from(document.querySelectorAll('*')).filter(el => (el.innerText || '').includes('21 Years'));
      if (expBoxes.length > 0) {
        expBoxes[0].click();
      }
    });
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      const allItems = Array.from(document.querySelectorAll('li, div, span'));
      const oneYear = allItems.find(el => (el.innerText || '').trim() === '1 Year');
      if (oneYear) oneYear.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_fields_fixed.png' });

    // 5. Click Submit Application button
    const submitResult = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
      const submitBtn = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase() === 'submit application');
      if (submitBtn) {
        submitBtn.click();
        return 'Clicked Submit Application';
      }
      return 'Submit button not found';
    });
    console.log(submitResult);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_final_submitted_success.png' });
    console.log('Submitted snapshot captured.');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
