import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('No WA page');
    await browser.disconnect();
    return;
  }

  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('1. Clicking Plus / Attach button...');
  await wa.evaluate(() => {
    const btn = document.querySelector('span[data-icon="plus"], span[data-icon="attach-menu-plus"]')?.closest('button');
    if (btn) btn.click();
  });
  await sleep(2000);

  console.log('2. Clicking Document option in popup menu...');
  await wa.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const doc = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (doc) doc.click();
  });
  await sleep(2000);

  const inputs = await wa.$$('input[type="file"]');
  console.log(`Found ${inputs.length} file inputs.`);
  let targetInput = inputs[inputs.length - 1];
  for (const inp of inputs) {
    const acc = await inp.evaluate(el => el.getAttribute('accept'));
    if (acc === '*' || !acc.includes('image')) {
      targetInput = inp;
      break;
    }
  }

  console.log('3. Uploading MERN resume...');
  await targetInput.uploadFile(mernResume);
  await sleep(4000);

  console.log('4. Clicking Send button in document preview...');
  const sendClicked = await wa.evaluate(() => {
    const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, div[role="button"]')
             || document.querySelector('[aria-label="Send"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Send clicked:', sendClicked);
  if (!sendClicked) {
    await wa.keyboard.press('Enter');
  }

  await sleep(5000);

  // Capture final screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_delivered.png' });
  console.log('Proof saved to screenshots/2026-10-12/wa_aman_both_resumes_delivered.png');

  await browser.disconnect();
}

main().catch(console.error);
