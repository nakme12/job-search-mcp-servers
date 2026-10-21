import puppeteer from 'puppeteer-core';
import fs from 'fs';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fillHandshake() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) {
    console.error('Handshake page not found');
    await browser.disconnect();
    return;
  }

  console.log('--- Starting Handshake Form Fill ---');

  // Helper to select option from custom listbox or combobox
  async function selectCustomOption(inputOrSelectId, targetText) {
    console.log(`Selecting '${targetText}' for #${inputOrSelectId}...`);
    const success = await page.evaluate((id, text) => {
      // 1. Try finding direct select element
      const sel = document.getElementById(id);
      if (sel && sel.tagName === 'SELECT') {
        const opt = Array.from(sel.options).find(o => o.text.toLowerCase().includes(text.toLowerCase()) || o.value.toLowerCase().includes(text.toLowerCase()));
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, inputOrSelectId, targetText);

    if (!success) {
      // Try clicking combobox button and selecting from listbox
      console.log(`Trying combobox click for text: ${targetText}`);
      await page.evaluate((text) => {
        const items = Array.from(document.querySelectorAll('[role="option"], li, div[role="listbox"] div'));
        const match = items.find(el => el.innerText && el.innerText.toLowerCase().trim() === text.toLowerCase().trim());
        if (match) {
          match.click();
          return true;
        }
        return false;
      }, targetText);
    }
    await sleep(500);
  }

  // 1. Background: Computer Science
  console.log('1. Setting Background -> Computer Science');
  await page.evaluate(() => {
    // Click background combobox
    const labels = Array.from(document.querySelectorAll('label'));
    const bgLabel = labels.find(l => l.innerText.includes('Which field best describes'));
    if (bgLabel) {
      const parent = bgLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === 'Computer Science');
    if (opt) opt.click();
  });
  await sleep(600);

  // 2. Current role: Software Developers or Web Developers
  console.log('2. Setting Role -> Web Developers');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const rLabel = labels.find(l => l.innerText.includes("What's your current role?"));
    if (rLabel) {
      const parent = rLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === 'Web Developers' || o.innerText.trim() === 'Software Developers');
    if (opt) opt.click();
  });
  await sleep(600);

  // 3. School: Other
  console.log('3. Setting School -> Other');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const sLabel = labels.find(l => l.innerText.includes('What school did you attend?'));
    if (sLabel) {
      const parent = sLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === 'Other');
    if (opt) opt.click();
  });
  await sleep(600);

  // 4. Highest education: Bachelors
  console.log('4. Setting Education -> Bachelors');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const eLabel = labels.find(l => l.innerText.includes('highest level of education'));
    if (eLabel) {
      const parent = eLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === 'Bachelors');
    if (opt) opt.click();
  });
  await sleep(600);

  // 5. Graduation Year: 2024
  console.log('5. Setting Graduation Year -> 2024');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const yLabel = labels.find(l => l.innerText.includes('When did you graduate?'));
    if (yLabel) {
      const parent = yLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === '2024');
    if (opt) opt.click();
  });
  await sleep(600);

  // 6. LinkedIn URL
  console.log('6. Typing LinkedIn URL');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const lLabel = labels.find(l => l.innerText.includes('LinkedIn URL'));
    if (lLabel) {
      const inp = lLabel.closest('div')?.querySelector('input') || document.querySelector('input[type="text"]');
      if (inp) {
        inp.focus();
        document.execCommand('insertText', false, 'https://www.linkedin.com/in/pratik-patidar');
      }
    }
  });
  await sleep(600);

  // 7. Country: India
  console.log('7. Setting Country -> India');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const cLabel = labels.find(l => l.innerText.includes('What country are you located in?'));
    if (cLabel) {
      const parent = cLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === 'India');
    if (opt) opt.click();
  });
  await sleep(600);

  // 8. How did you hear about us -> LinkedIn jobs
  console.log('8. Setting Hear About Us -> LinkedIn jobs');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const hLabel = labels.find(l => l.innerText.includes('How did you hear about us?'));
    if (hLabel) {
      const parent = hLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button') : null;
      if (btn) btn.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role="option"], li'));
    const opt = opts.find(o => o.innerText.trim() === 'LinkedIn jobs');
    if (opt) opt.click();
  });
  await sleep(600);

  // 9. Terms Checkbox
  console.log('9. Checking Agreement Checkbox');
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });
  await sleep(1000);

  // Screenshot pre-submit
  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_filled_presubmit.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_filled_presubmit.png');

  await browser.disconnect();
}

fillHandshake().catch(console.error);
