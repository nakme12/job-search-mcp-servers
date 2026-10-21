import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // 1. Click Aman Techstuff row directly via evaluate
  console.log('1. Clicking Aman Techstuff row...');
  await wa.evaluate(() => {
    const all = Array.from(document.querySelectorAll('#pane-side span'));
    const amanSpan = all.find(s => s.innerText && s.innerText.includes('Aman Techstuff'));
    if (amanSpan) {
      // Find clickable ancestor
      const item = amanSpan.closest('[role="listitem"]') || amanSpan.closest('[data-testid="cell-frame-container"]') || amanSpan.parentElement;
      item.click();
    }
  });
  await sleep(2500);

  // Assert header
  const header = await wa.evaluate(() => document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' '));
  console.log('Active Chat Header:', header);

  // 2. Click Attach paperclip button
  console.log('2. Clicking Attach button...');
  await wa.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Attach"]');
    if (btn) btn.click();
  });
  await sleep(2000);

  // 3. Inspect Document item in the menu
  const docButton = await wa.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const doc = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (doc) {
      const btn = doc.closest('li') || doc.closest('button') || doc;
      // Also check if there is an input[type="file"] inside or adjacent
      const input = btn.querySelector('input[type="file"]') || document.querySelector('input[type="file"][accept*="*"]');
      return {
        found: true,
        hasInput: !!input,
        inputAccept: input ? input.getAttribute('accept') : null
      };
    }
    return { found: false };
  });

  console.log('Document item info:', docButton);

  // Let's inspect all input[type="file"] elements right now!
  const allInputs = await wa.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="file"]')).map((el, i) => ({
      index: i,
      accept: el.getAttribute('accept'),
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className
    }));
  });
  console.log('All inputs right now:', allInputs);

  await browser.disconnect();
}

main().catch(console.error);
