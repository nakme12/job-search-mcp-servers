import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Click the Attach button element directly in DOM
  console.log('1. Dispatching click on Attach button...');
  await wa.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Attach"]');
    if (btn) btn.click();
  });
  await sleep(1500);

  // Take screenshot to see if menu opened
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_after_dom_click.png' });

  // Check if aria-expanded is true
  const expanded = await wa.evaluate(() => {
    return document.querySelector('button[aria-label="Attach"]')?.getAttribute('aria-expanded');
  });
  console.log('aria-expanded:', expanded);

  // Let's inspect all ul, li, menu, popover elements
  const popups = await wa.evaluate(() => {
    const menus = Array.from(document.querySelectorAll('[role="menu"], ul, [data-animate-dropdown-item="true"]'));
    return menus.map(m => ({
      tag: m.tagName,
      role: m.getAttribute('role'),
      text: m.innerText?.replace(/\n+/g, ' | ')
    }));
  });
  console.log('Popups found:', JSON.stringify(popups, null, 2));

  // Find Document item in popup
  const docItem = await wa.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const doc = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (doc) {
      const r = doc.getBoundingClientRect();
      return { found: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    }
    return { found: false };
  });
  console.log('Document item:', docItem);

  if (docItem.found) {
    console.log('Triggering filechooser and clicking Document...');
    const [fileChooser] = await Promise.all([
      wa.waitForFileChooser({ timeout: 5000 }).catch(e => null),
      wa.mouse.click(docItem.x, docItem.y)
    ]);

    if (fileChooser) {
      console.log('FileChooser intercepted! Uploading FE Resume...');
      await fileChooser.accept([feResume]);
      await sleep(4000);
      await wa.screenshot({ path: 'screenshots/2026-10-12/fe_preview_success.png' });

      // Click Send button
      await wa.evaluate(() => {
        const sendBtn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
                     || document.querySelector('[aria-label="Send"]');
        if (sendBtn) sendBtn.click();
      });
      await sleep(5000);
      console.log('FE Resume sent!');
    }
  }

  await browser.disconnect();
}

main().catch(console.error);
