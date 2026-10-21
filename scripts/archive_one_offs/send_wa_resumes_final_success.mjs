import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Verify chat is Aman Techstuff
  const header = await wa.evaluate(() => document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' '));
  console.log('Current chat header:', header);
  if (!header || !header.toLowerCase().includes('aman')) {
    console.log('Opening Aman Techstuff chat...');
    await wa.evaluate(() => {
      const items = Array.from(document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]'));
      const aman = items.find(i => i.innerText && i.innerText.includes('Aman Techstuff'));
      if (aman) aman.click();
    });
    await sleep(2000);
  }

  async function sendResume(filePath, label) {
    console.log(`\n=== Delivering ${label} ===`);
    // Mouse click on button at x=560, y=693
    console.log('Clicking Attach button at x=560, y=693...');
    await wa.mouse.click(560, 693);
    await sleep(1500);

    // Look for popup menu in DOM
    const menuInfo = await wa.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'))
        .filter(el => el.innerText && el.innerText.trim() === 'Document');
      if (items.length > 0) {
        const doc = items[0];
        const r = doc.getBoundingClientRect();
        return {
          found: true,
          x: Math.round(r.x + r.width/2),
          y: Math.round(r.y + r.height/2)
        };
      }
      return { found: false };
    });

    console.log('Document menu item found:', menuInfo);

    if (menuInfo.found) {
      console.log(`Intercepting fileChooser and clicking Document at (${menuInfo.x}, ${menuInfo.y})...`);
      const [fileChooser] = await Promise.all([
        wa.waitForFileChooser({ timeout: 6000 }).catch(e => {
          console.log('waitForFileChooser timed out:', e.message);
          return null;
        }),
        wa.mouse.click(menuInfo.x, menuInfo.y)
      ]);

      if (fileChooser) {
        console.log(`FileChooser intercepted successfully! Uploading ${label}...`);
        await fileChooser.accept([filePath]);
        await sleep(4000);

        // Click Send
        console.log('Clicking Send button...');
        const sent = await wa.evaluate(() => {
          const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
                   || document.querySelector('[aria-label="Send"]');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        console.log('Send clicked:', sent);
        if (!sent) {
          await wa.keyboard.press('Enter');
        }
        await sleep(5000);
        return true;
      }
    }
    return false;
  }

  // 1. Send Frontend Resume
  const feSuccess = await sendResume(feResume, 'Frontend Engineer Resume');
  console.log('Frontend Resume send status:', feSuccess);

  await sleep(2000);

  // 2. Send MERN Resume
  const mernSuccess = await sendResume(mernResume, 'MERN Full Stack Resume');
  console.log('MERN Resume send status:', mernSuccess);

  await sleep(3000);

  // Final confirmation screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_success.png' });
  console.log('\nFinal screenshot saved to screenshots/2026-10-12/wa_aman_both_resumes_success.png');

  await browser.disconnect();
}

main().catch(console.error);
