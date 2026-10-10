const puppeteer = require('puppeteer-core');
const path = require('path');

const RESUME_PATH = 'D:\\adi\\mcp\\Pratik Patidar Resume - React Developer.pdf';

async function stepThroughEasyApply(page) {
  for (let step = 1; step <= 15; step++) {
    console.log(`\n================== STEP ${step} ==================`);
    const state = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { hasDialog: false };

      const h = dialog.querySelector('h2, h3, h4')?.innerText || '';
      const text = dialog.innerText;

      // Find all inputs/selects
      const inputs = Array.from(dialog.querySelectorAll('input, select, textarea')).map(i => ({
        tagName: i.tagName,
        type: i.type,
        id: i.id,
        name: i.name,
        value: i.value,
        checked: i.checked,
        required: i.required,
        label: i.closest('div')?.innerText?.split('\n')[0] || ''
      }));

      // Find all buttons in dialog
      const buttons = Array.from(dialog.querySelectorAll('button')).map((b, idx) => ({
        idx,
        text: b.innerText.trim(),
        ariaLabel: b.getAttribute('aria-label') || '',
        disabled: b.disabled,
        className: b.className
      }));

      return { hasDialog: true, header: h, fullText: text, inputs, buttons };
    });

    if (!state.hasDialog) {
      console.log('No dialog found. Either submitted or closed.');
      break;
    }

    console.log(`Header: ${state.header}`);
    console.log(`Inputs found:`, state.inputs);
    console.log(`Buttons found:`, state.buttons);

    // Fill phone number if on contact info step
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return;

      // Phone input
      const phone = dialog.querySelector('input[type="tel"], input[id*="phoneNumber"], input[name*="phoneNumber"], input[aria-describedby*="phoneNumber"]');
      if (phone && (!phone.value || phone.value.trim().length < 10)) {
        phone.focus();
        phone.value = '8269647990';
        phone.dispatchEvent(new Event('input', { bubbles: true }));
        phone.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Check for numeric experience questions
      const numInputs = dialog.querySelectorAll('input[type="text"], input[type="number"]');
      for (const ni of numInputs) {
        const lbl = (ni.closest('label')?.innerText || ni.closest('.fb-dash-form-element')?.innerText || '').toLowerCase();
        if (lbl.includes('experience') || lbl.includes('how many years')) {
          if (!ni.value) {
            ni.value = '1.5';
            ni.dispatchEvent(new Event('input', { bubbles: true }));
            ni.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }

      // Check for radio buttons (e.g. Yes/No questions like authorized to work in India)
      const radioGroups = {};
      const radios = dialog.querySelectorAll('input[type="radio"]');
      radios.forEach(r => {
        const name = r.name || 'group';
        if (!radioGroups[name]) radioGroups[name] = [];
        radioGroups[name].push(r);
      });

      for (const name in radioGroups) {
        const group = radioGroups[name];
        const isChecked = group.some(r => r.checked);
        if (!isChecked) {
          // Find 'Yes' option or first option
          const yesOption = group.find(r => {
            const label = r.closest('label')?.innerText || r.parentElement?.innerText || '';
            return label.toLowerCase().includes('yes');
          }) || group[0];
          if (yesOption) {
            yesOption.click();
            yesOption.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });

    // Check for file upload input
    const fileInputs = await page.$$('[role="dialog"] input[type="file"]');
    if (fileInputs.length > 0) {
      console.log(`Found ${fileInputs.length} file inputs. Checking upload...`);
      for (const fi of fileInputs) {
        try {
          await fi.uploadFile(RESUME_PATH);
          console.log('Uploaded React Developer resume.');
          await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          console.log('Upload error (might be optional or pre-selected):', e.message);
        }
      }
    }

    // Now click Next, Review, or Submit
    const clickedAction = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return 'NO_DIALOG';

      const buttons = Array.from(dialog.querySelectorAll('button'));

      // Check Submit
      const submitBtn = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().trim();
        return t.includes('submit application') || t === 'submit';
      });
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        return 'CLICKED_SUBMIT';
      }

      // Check Review
      const reviewBtn = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().trim();
        return t === 'review' || t.includes('review your application');
      });
      if (reviewBtn && !reviewBtn.disabled) {
        reviewBtn.click();
        return 'CLICKED_REVIEW';
      }

      // Check Next
      const nextBtn = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().trim();
        return t === 'next' || t.includes('continue to next step');
      });
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        return 'CLICKED_NEXT';
      }

      return 'NO_MATCHING_BUTTON';
    });

    console.log('Action result:', clickedAction);

    if (clickedAction === 'CLICKED_SUBMIT') {
      console.log('Submitted application! Waiting 4s...');
      await new Promise(r => setTimeout(r, 4000));
      await page.evaluate(() => {
        const dismiss = document.querySelector('button[aria-label="Dismiss"], button[data-control-name="dismiss_modal"], .artdeco-modal__dismiss');
        if (dismiss) dismiss.click();
      });
      return true;
    }

    if (clickedAction === 'NO_MATCHING_BUTTON') {
      console.log('No next/review/submit button found or button disabled.');
      // Inspect why disabled
      const disabledInfo = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return null;
        const errs = Array.from(dialog.querySelectorAll('.artdeco-inline-feedback--error, [data-test-form-element-error-messages]')).map(e => e.innerText);
        return { errs, text: dialog.innerText };
      });
      console.log('Dialog feedback / errors:', disabledInfo);
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  return false;
}

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('4446731371'));
  if (page) {
    console.log('Found EXL tab');
    await page.bringToFront();

    // Check if dialog is open, if not click Continue / Easy Apply
    const isOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    if (!isOpen) {
      console.log('Opening Easy Apply modal...');
      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span, button, a'));
        const target = spans.find(s => {
          const t = s.innerText?.trim();
          return t === 'Continue' || t === 'Easy Apply' || t === 'Apply';
        });
        if (target) {
          const c = target.closest('button') || target.closest('a') || target;
          c.click();
        }
      });
      await new Promise(r => setTimeout(r, 2500));
    }

    const res = await stepThroughEasyApply(page);
    console.log('Final Result for EXL:', res);
  }

  browser.disconnect();
}

main().catch(console.error);
