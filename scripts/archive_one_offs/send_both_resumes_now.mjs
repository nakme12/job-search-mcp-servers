import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Document menu item is clearly visible right now at x=365, y=538!
  console.log('1. Clicking Document at x=365, y=538 with fileChooser listener...');
  const [fileChooser] = await Promise.all([
    wa.waitForFileChooser({ timeout: 6000 }).catch(e => {
      console.log('waitForFileChooser error:', e.message);
      return null;
    }),
    wa.mouse.click(365, 538)
  ]);

  if (fileChooser) {
    console.log('SUCCESS! Intercepted native file chooser for FE resume.');
    await fileChooser.accept([feResume]);
    await sleep(4000);

    await wa.screenshot({ path: 'screenshots/2026-10-12/preview_fe_live.png' });

    // In preview modal, click send (bottom right green circle, approx x=1466, y=670 or find send button)
    console.log('Clicking Send button for FE resume...');
    const sent = await wa.evaluate(() => {
      const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
               || document.querySelector('[aria-label="Send"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Send clicked via DOM:', sent);
    if (!sent) {
      await wa.mouse.click(1466, 670);
    }
    await sleep(5000);
  } else {
    console.log('No file chooser intercepted. Checking if input mounted...');
    const inputs = await wa.$$('input[type="file"]');
    console.log(`Found ${inputs.length} inputs`);
  }

  // Now send MERN resume
  console.log('\n2. Opening attach menu for MERN Resume...');
  await wa.mouse.click(366, 948); // or bottom attach
  await sleep(2000);

  // If menu didn't open with 366, 948, click at paperclip x=560, y=693
  let menuOpen = await wa.evaluate(() => document.body.innerText.includes('Photos & videos'));
  if (!menuOpen) {
    console.log('Clicking paperclip at x=560, y=693...');
    await wa.mouse.click(560, 693);
    await sleep(2000);
  }

  console.log('Clicking Document at x=365, y=538 for MERN...');
  const [fileChooser2] = await Promise.all([
    wa.waitForFileChooser({ timeout: 6000 }).catch(e => null),
    wa.mouse.click(365, 538)
  ]);

  if (fileChooser2) {
    console.log('SUCCESS! Intercepted native file chooser for MERN resume.');
    await fileChooser2.accept([mernResume]);
    await sleep(4000);

    await wa.screenshot({ path: 'screenshots/2026-10-12/preview_mern_live.png' });

    console.log('Clicking Send button for MERN resume...');
    const sent2 = await wa.evaluate(() => {
      const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
               || document.querySelector('[aria-label="Send"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Send clicked via DOM:', sent2);
    if (!sent2) {
      await wa.mouse.click(1466, 670);
    }
    await sleep(5000);
  }

  // Capture final chat screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_final_verified.png' });
  console.log('\nFinal screenshot saved to screenshots/2026-10-12/wa_aman_both_resumes_final_verified.png');

  await browser.disconnect();
}

main().catch(console.error);
