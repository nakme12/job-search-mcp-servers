import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Let's locate the attach paperclip inside DOM directly
  console.log('1. Locating paperclip element in DOM...');
  const attachFound = await wa.evaluate(() => {
    // Look for attach button in footer
    const footer = document.querySelector('footer');
    if (!footer) return { error: 'No footer found' };
    const buttons = Array.from(footer.querySelectorAll('button, div[role="button"]'));
    const attach = buttons.find(b => b.getAttribute('aria-label') === 'Attach' || b.querySelector('span[data-icon="plus"]') || b.querySelector('span[data-icon="attach-menu-plus"]'));
    if (attach) {
      const r = attach.getBoundingClientRect();
      attach.click();
      return { clicked: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    }
    return { error: 'Attach button not found in footer', btnCount: buttons.length };
  });

  console.log('Attach click result:', attachFound);
  await sleep(2000);

  // Take screenshot to see if menu popped up
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_footer_menu_open.png' });

  // Now find Document menu item
  const docInfo = await wa.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const docEl = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (docEl) {
      const r = docEl.getBoundingClientRect();
      return { found: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    }
    return { found: false };
  });

  console.log('Document menu item:', docInfo);

  if (docInfo.found) {
    console.log(`Setting up fileChooser listener and clicking Document at (${docInfo.x}, ${docInfo.y})...`);
    const [fileChooser] = await Promise.all([
      wa.waitForFileChooser({ timeout: 6000 }).catch(e => {
        console.log('waitForFileChooser timed out:', e.message);
        return null;
      }),
      wa.mouse.click(docInfo.x, docInfo.y)
    ]);

    if (fileChooser) {
      console.log('Intercepted fileChooser! Uploading FE Resume...');
      await fileChooser.accept([feResume]);
      await sleep(4000);

      // Take screenshot of preview
      await wa.screenshot({ path: 'screenshots/2026-10-12/wa_fe_preview.png' });

      // Click Send button
      console.log('Clicking send...');
      await wa.evaluate(() => {
        const sendBtn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, div[role="button"]')
                     || document.querySelector('[aria-label="Send"]');
        if (sendBtn) sendBtn.click();
      });
      await sleep(5000);
      console.log('FE Resume dispatched!');
    }
  }

  // Now do the same for MERN resume
  console.log('\n2. Sending MERN Resume...');
  await wa.evaluate(() => {
    const footer = document.querySelector('footer');
    const attach = footer ? Array.from(footer.querySelectorAll('button, div[role="button"]')).find(b => b.getAttribute('aria-label') === 'Attach' || b.querySelector('span[data-icon="plus"]')) : null;
    if (attach) attach.click();
  });
  await sleep(2000);

  const docInfo2 = await wa.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const docEl = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (docEl) {
      const r = docEl.getBoundingClientRect();
      return { found: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    }
    return { found: false };
  });

  if (docInfo2.found) {
    const [fileChooser2] = await Promise.all([
      wa.waitForFileChooser({ timeout: 6000 }).catch(e => {
        console.log('waitForFileChooser timed out:', e.message);
        return null;
      }),
      wa.mouse.click(docInfo2.x, docInfo2.y)
    ]);

    if (fileChooser2) {
      console.log('Intercepted fileChooser 2! Uploading MERN Resume...');
      await fileChooser2.accept([mernResume]);
      await sleep(4000);

      await wa.screenshot({ path: 'screenshots/2026-10-12/wa_mern_preview.png' });

      await wa.evaluate(() => {
        const sendBtn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, div[role="button"]')
                     || document.querySelector('[aria-label="Send"]');
        if (sendBtn) sendBtn.click();
      });
      await sleep(5000);
      console.log('MERN Resume dispatched!');
    }
  }

  // Final proof screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_final_success.png' });
  console.log('\nFinal proof saved to screenshots/2026-10-12/wa_aman_both_resumes_final_success.png');

  await browser.disconnect();
}

main().catch(console.error);
