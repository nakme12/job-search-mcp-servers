const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function fixHeadoutDropdowns() {
  const profile = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json', 'utf8')).profile;
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('greenhouse.io/headoutcareers'));
  if (!page) {
    console.error('Headout page not found');
    process.exit(1);
  }

  console.log('Focusing and interacting with custom React Select components on Headout...');

  // 1. Text inputs: Current compensation & Notice period
  await page.evaluate((prof) => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }
    // Current compensation
    setInput('question_8687533006', `${prof.current_ctc_lpa} LPA`);
    // Notice period (in days)
    setInput('question_8647646006', prof.notice_period_days);
  }, profile);

  // 2. Click each select control, type, and press Enter
  const selectTasks = [
    { labelText: 'Country', query: 'India' },
    { labelText: 'How much of your production', query: '1' },
    { labelText: 'How many years of full-time', query: '1' },
    { labelText: 'Bangalore or are willing to relocate', query: 'Yes' },
    { labelText: 'interviewed for this role in the past 1 year', query: 'No' },
    { labelText: 'confirm that all the information', query: 'Yes' },
    { labelText: 'Self-Identify Your Gender', query: 'Male' }
  ];

  for (const task of selectTasks) {
    console.log(`Processing dropdown for: "${task.labelText}" with query: "${task.query}"`);
    const success = await page.evaluate((lText, q) => {
      const allLabels = Array.from(document.querySelectorAll('label, .field'));
      const targetBlock = allLabels.find(l => (l.innerText || '').toLowerCase().includes(lText.toLowerCase()));
      if (targetBlock) {
        const inputOrControl = targetBlock.querySelector('input[role="combobox"], .select__input input, input[aria-autocomplete="list"], .select__control');
        if (inputOrControl) {
          inputOrControl.focus();
          if (inputOrControl.tagName === 'INPUT') {
            inputOrControl.value = q;
            inputOrControl.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            inputOrControl.click();
          }
          return true;
        }
      }
      return false;
    }, task.labelText, task.query);

    if (success) {
      await new Promise(r => setTimeout(r, 600));
      await page.keyboard.press('ArrowDown');
      await new Promise(r => setTimeout(r, 300));
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('Finished filling dropdowns. Triggering submit to check remaining errors...');
  const submitSuccess = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  await new Promise(r => setTimeout(r, 3000));

  const remainingErrors = await page.evaluate(() => {
    const redTexts = Array.from(document.querySelectorAll('*')).filter(el => {
      const s = window.getComputedStyle(el);
      return (s.color === 'rgb(255, 0, 0)' || s.color === 'rgb(220, 53, 69)') && el.innerText.trim().length > 0;
    }).map(el => el.innerText.trim());
    return Array.from(new Set(redTexts));
  });

  console.log('Remaining errors after dropdown fix:', remainingErrors);
  process.exit(0);
}

fixHeadoutDropdowns().catch(err => {
  console.error(err);
  process.exit(1);
});
