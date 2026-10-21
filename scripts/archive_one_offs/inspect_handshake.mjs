import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function inspectHandshake() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  
  // Find or open the handshake tab
  let page = pages.find(p => p.url().includes('joinhandshake.com'));
  if (!page) {
    console.log('Handshake page not found, creating new background page...');
    page = await browser.newPage();
    await page.goto('https://ai.joinhandshake.com/fellow/onboarding', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await new Promise(r => setTimeout(r, 4000));

  const pageInfo = await page.evaluate(() => {
    const title = document.title;
    const url = window.location.href;
    const bodyText = document.body ? document.body.innerText.slice(0, 800) : '';
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      text: el.innerText || el.value || ''
    }));
    return { title, url, bodyText, inputs: inputs.slice(0, 25) };
  });

  console.log('=== HANDSHAKE PAGE INFO ===');
  console.log(JSON.stringify(pageInfo, null, 2));

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_onboarding_presubmit.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_onboarding_presubmit.png');

  await browser.disconnect();
}

inspectHandshake().catch(console.error);
