const puppeteer = require('puppeteer-core');
const path = require('path');

const RESUME_PATH = 'D:\\adi\\mcp\\Pratik Patidar Resume - React Developer.pdf';

async function autoApplyLinkedIn(page) {
  console.log('Target Page:', page.url());
  await page.bringToFront();

  // Find Apply / Continue / Easy Apply button
  const clickedApply = await page.evaluate(() => {
    const findBtn = (text) => {
      const els = Array.from(document.querySelectorAll('button, a, span'));
      return els.find(el => el.innerText && el.innerText.trim().toLowerCase() === text.toLowerCase());
    };
    const target = findBtn('Continue') || findBtn('Easy Apply') || findBtn('Apply');
    if (target) {
      const clickTarget = target.closest('button') || target.closest('a') || target;
      clickTarget.click();
      return true;
    }
    return false;
  });

  console.log('Clicked initial button:', clickedApply);
  if (!clickedApply) return { success: false, reason: 'No apply/continue button' };

  await new Promise(r => setTimeout(r, 2500));

  for (let step = 1; step <= 12; step++) {
    console.log(`\n=== STEP ${step} ===`);

    const modalState = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal') || document.body;
      const text = modal.innerText;
      
      // Look for inputs
      const phoneInput = modal.querySelector('input[id*="phoneNumber"], input[name*="phoneNumber"], input[aria-describedby*="phoneNumber"], input[type="tel"]');
      let filledPhone = false;
      if (phoneInput && (!phoneInput.value || phoneInput.value.length < 10)) {
        phoneInput.value = '8269647990';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        filledPhone = true;
      }

      // Check all available clickable buttons
      const buttons = Array.from(modal.querySelectorAll('button')).map(b => ({
        text: b.innerText.trim(),
        ariaLabel: b.getAttribute('aria-label') || '',
        disabled: b.disabled
      }));

      return { modalFound: !!modal, textSample: text.substring(0, 300), filledPhone, buttons };
    });

    console.log('Modal state:', JSON.stringify(modalState, null, 2));

    // Check file upload
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      console.log(`Found ${fileInputs.length} file inputs. Checking upload...`);
      for (const fi of fileInputs) {
        try {
          await fi.uploadFile(RESUME_PATH);
          console.log('Uploaded resume to file input');
          await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          console.log('Upload error (might already have resume):', e.message);
        }
      }
    }

    // Determine next action
    const actionResult = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal') || document.body;
      const buttons = Array.from(modal.querySelectorAll('button'));

      // Check Submit
      const submitBtn = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
        return t.includes('submit application') || t === 'submit';
      });
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        return { action: 'SUBMIT' };
      }

      // Check Review
      const reviewBtn = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
        return t.includes('review') || t === 'review application';
      });
      if (reviewBtn && !reviewBtn.disabled) {
        reviewBtn.click();
        return { action: 'REVIEW' };
      }

      // Check Next
      const nextBtn = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
        return t === 'next' || t.includes('continue to next step');
      });
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        return { action: 'NEXT' };
      }

      return { action: 'NONE' };
    });

    console.log('Action performed:', actionResult);

    if (actionResult.action === 'SUBMIT') {
      console.log('Application submitted!');
      await new Promise(r => setTimeout(r, 4000));
      // Dismiss confirmation
      await page.evaluate(() => {
        const dismissBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
          return t.includes('dismiss') || t.includes('done') || t.includes('close');
        });
        if (dismissBtn) dismissBtn.click();
      });
      return { success: true, url: page.url() };
    }

    if (actionResult.action === 'NONE') {
      console.log('No next / review / submit button found or clickable. Checking if finished or stuck...');
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  return { success: false, reason: 'Stuck or incomplete' };
}

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  for (const page of pages) {
    if (page.url().includes('4446731371')) {
      const res = await autoApplyLinkedIn(page);
      console.log('Result for EXL:', res);
    }
  }

  browser.disconnect();
}

main().catch(console.error);
