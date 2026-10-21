const puppeteer = require('puppeteer-core');
const path = require('path');

const RESUME_PATH = 'D:\\adi\\mcp\\Pratik Patidar Resume - React Developer.pdf';

async function stepThroughApplication(page) {
  for (let step = 1; step <= 10; step++) {
    console.log(`\n================== STEP ${step} ==================`);
    
    // Check current visible text and inputs
    const info = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        tagName: i.tagName,
        type: i.type,
        id: i.id,
        name: i.name,
        value: i.value,
        checked: i.checked,
        label: i.closest('label')?.innerText || i.closest('div')?.innerText?.substring(0, 100) || ''
      }));

      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText.trim(),
        ariaLabel: b.getAttribute('aria-label') || '',
        disabled: b.disabled
      })).filter(b => b.text.length > 0 || b.ariaLabel.length > 0);

      return { preview: bodyText.substring(0, 400), inputs, buttons };
    });

    console.log('Page preview:\n', info.preview);

    // Auto-fill phone / text fields / radio options
    await page.evaluate(() => {
      // Fill phone if empty
      const phone = document.querySelector('input[type="tel"]');
      if (phone && (!phone.value || phone.value.trim().length < 10)) {
        phone.focus();
        phone.value = '8269647990';
        phone.dispatchEvent(new Event('input', { bubbles: true }));
        phone.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Check numeric experience questions
      const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea');
      for (const ti of textInputs) {
        const lbl = (ti.closest('label')?.innerText || ti.closest('div')?.innerText || '').toLowerCase();
        if ((lbl.includes('experience') || lbl.includes('how many years') || lbl.includes('years of')) && !ti.value) {
          ti.focus();
          ti.value = '1.5';
          ti.dispatchEvent(new Event('input', { bubbles: true }));
          ti.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (lbl.includes('notice period') && !ti.value) {
          ti.focus();
          ti.value = 'Immediate / 15 days';
          ti.dispatchEvent(new Event('input', { bubbles: true }));
          ti.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (lbl.includes('current ctc') && !ti.value) {
          ti.focus();
          ti.value = '3.5 LPA';
          ti.dispatchEvent(new Event('input', { bubbles: true }));
          ti.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (lbl.includes('expected ctc') && !ti.value) {
          ti.focus();
          ti.value = '6 LPA';
          ti.dispatchEvent(new Event('input', { bubbles: true }));
          ti.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (lbl.includes('city') || lbl.includes('location') && !ti.value) {
          ti.focus();
          ti.value = 'Indore';
          ti.dispatchEvent(new Event('input', { bubbles: true }));
          ti.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Check radio buttons (Yes / No)
      const radioGroups = {};
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach(r => {
        const name = r.name || 'group';
        if (!radioGroups[name]) radioGroups[name] = [];
        radioGroups[name].push(r);
      });

      for (const name in radioGroups) {
        const group = radioGroups[name];
        const isChecked = group.some(r => r.checked);
        if (!isChecked) {
          const yesOption = group.find(r => {
            const label = (r.closest('label')?.innerText || r.parentElement?.innerText || '').toLowerCase();
            return label.includes('yes') || label.includes('agree') || label.includes('authorized');
          }) || group[0];
          if (yesOption) {
            yesOption.click();
            yesOption.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });

    // Check file upload
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      console.log(`Found ${fileInputs.length} file inputs. Attaching resume...`);
      for (const fi of fileInputs) {
        try {
          await fi.uploadFile(RESUME_PATH);
          console.log('Uploaded React Developer resume!');
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
          console.log('Upload error / notice:', e.message);
        }
      }
    }

    // Now click Next, Review, or Submit
    const action = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Look for submit application
      const submit = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().trim();
        return t.includes('submit application') || t === 'submit';
      });
      if (submit && !submit.disabled) {
        submit.click();
        return 'SUBMIT';
      }

      // Look for review
      const review = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().trim();
        return t === 'review' || t.includes('review your application');
      });
      if (review && !review.disabled) {
        review.click();
        return 'REVIEW';
      }

      // Look for next
      const next = buttons.find(b => {
        const t = (b.innerText + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().trim();
        return t === 'next' || t.includes('continue to next step');
      });
      if (next && !next.disabled) {
        next.click();
        return 'NEXT';
      }

      return 'NONE';
    });

    console.log('Action performed:', action);

    if (action === 'SUBMIT') {
      console.log('Application submitted successfully!');
      await new Promise(r => setTimeout(r, 4000));
      return true;
    }

    if (action === 'NONE') {
      console.log('No action button found or enabled. Checking if finished...');
      const finished = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('application submitted') || t.includes('your application was sent');
      });
      if (finished) {
        console.log('Application confirmed submitted!');
        return true;
      }
      break;
    }

    await new Promise(r => setTimeout(r, 2500));
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
    console.log('Stepping through EXL form...');
    await page.bringToFront();
    const res = await stepThroughApplication(page);
    console.log('EXL submission complete. Result:', res);
  }

  browser.disconnect();
}

main().catch(console.error);
