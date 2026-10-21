import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fixCitizenshipAndFinish() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) return;

  const target = page.frames().find(f => f.url().includes('links.taxbandits.io')) || page;

  console.log('1. Setting Country of Citizenship -> India');
  await target.evaluate(() => {
    // Look for select or dropdown for citizenship
    const allSelects = Array.from(document.querySelectorAll('select'));
    allSelects.forEach(sel => {
      const opt = Array.from(sel.options).find(o => o.text.includes('India') || o.value === 'IN');
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Also look for custom combobox or click elements
    const labels = Array.from(document.querySelectorAll('label, div, span'));
    const cit = labels.find(l => l.innerText && l.innerText.includes('Country of citizenship'));
    if (cit) {
      const box = cit.closest('div')?.querySelector('[role="combobox"], select, .form-select, input');
      if (box && box.tagName === 'SELECT') {
        const opt = Array.from(box.options).find(o => o.text.includes('India'));
        if (opt) {
          box.value = opt.value;
          box.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (box) {
        box.click();
      }
    }
  });
  await sleep(1000);

  // If a dropdown opened, click India
  await target.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, [role="option"], div'));
    const ind = items.find(el => el.innerText && el.innerText.trim() === 'India');
    if (ind) ind.click();
  });
  await sleep(1000);

  console.log('2. Clicking final Finish button (btnSave)...');
  await target.evaluate(() => {
    const btn = document.getElementById('btnSave');
    if (btn) {
      btn.click();
      return true;
    }
    const btns = Array.from(document.querySelectorAll('button, a'));
    const f = btns.find(b => b.innerText && b.innerText.trim() === 'Finish');
    if (f) {
      f.click();
      return true;
    }
    return false;
  });
  await sleep(4000);

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_final_submitted_proof.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_final_submitted_proof.png');

  await browser.disconnect();
}

fixCitizenshipAndFinish().catch(console.error);
