import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function completeW8BenSign() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) {
    console.error('payments-setup page not found');
    await browser.disconnect();
    return;
  }

  // Find if there is an iframe for DocuSign or HelloSign/Dropbox Sign
  const frames = page.frames();
  console.log(`Found ${frames.length} frames on page.`);

  let target = page;
  for (const f of frames) {
    if (f.url().includes('hellosign') || f.url().includes('docusign') || f.url().includes('tax') || f.url().includes('embedded')) {
      target = f;
      console.log('Targeting embedded frame:', f.url());
      break;
    }
  }

  // 1. Check the capacity checkbox
  console.log('Checking capacity checkbox...');
  await target.evaluate(() => {
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    cbs.forEach(cb => {
      if (!cb.checked) cb.click();
    });
  });
  await sleep(1000);

  // 2. Click "Click to E-sign"
  console.log('Clicking "Click to E-sign"...');
  await target.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const signBtn = btns.find(b => b.innerText && (b.innerText.includes('Click to E-sign') || b.innerText.includes('Click to sign') || b.innerText.includes('Sign Here')));
    if (signBtn) {
      signBtn.click();
      return true;
    }
    return false;
  });
  await sleep(2500);

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_esign_modal.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_esign_modal.png');

  await browser.disconnect();
}

completeW8BenSign().catch(console.error);
