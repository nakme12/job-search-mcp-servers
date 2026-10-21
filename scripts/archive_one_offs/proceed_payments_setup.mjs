import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function clickNextPayments() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) {
    console.error('payments-setup page not found');
    await browser.disconnect();
    return;
  }

  console.log('Ensuring W-8BEN and outside US are checked...');
  await page.evaluate(() => {
    // 1. W-8BEN radio
    const r1 = document.querySelector('input[value="form_w8"]') || document.getElementById('_r_1j_');
    if (r1 && !r1.checked) r1.click();

    // 2. outside US radio
    const r2 = document.querySelector('input[value="no"]') || document.getElementById('_r_1k_');
    if (r2 && !r2.checked) r2.click();
  });
  await sleep(600);

  console.log('Clicking Next button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nextBtn = btns.find(b => b.innerText.trim() === 'Next');
    if (nextBtn) nextBtn.click();
  });

  await sleep(3500);

  const newUrl = page.url();
  console.log('Page URL after Next:', newUrl);

  const fields = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label, h1, h2, h3, p')).map(l => l.innerText.replace(/\n+/g, ' ').trim()).filter(t => t.length > 0 && t.length < 150);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      tag: i.tagName,
      type: i.type,
      name: i.name,
      id: i.id,
      placeholder: i.placeholder
    }));
    return { labels: labels.slice(0, 20), inputs: inputs.slice(0, 20) };
  });

  console.log('New Fields on Next Screen:', JSON.stringify(fields, null, 2));

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_w8ben_form.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_w8ben_form.png');

  await browser.disconnect();
}

clickNextPayments().catch(console.error);
