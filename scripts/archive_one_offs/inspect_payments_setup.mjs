import puppeteer from 'puppeteer-core';

async function inspectPayments() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  
  let page = pages.find(p => p.url().includes('payments-setup'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://ai.joinhandshake.com/fellow/payments-setup', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const title = document.title;
    const bodyText = document.body ? document.body.innerText.slice(0, 1500) : '';
    const labels = Array.from(document.querySelectorAll('label, h1, h2, h3, p')).map(el => el.innerText.trim()).filter(Boolean);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      text: el.innerText || el.value
    }));
    return { title, bodyText, labels: labels.slice(0, 20), inputs: inputs.slice(0, 20) };
  });

  console.log('=== PAYMENTS SETUP INFO ===');
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_payments_setup.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_payments_setup.png');

  await browser.disconnect();
}

inspectPayments().catch(console.error);
