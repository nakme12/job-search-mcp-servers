import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.log('No WA tab');
    await browser.disconnect();
    return;
  }

  const data = await wa.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="file"]')).map((el, i) => ({
      index: i,
      accept: el.getAttribute('accept'),
      multiple: el.hasAttribute('multiple'),
      display: window.getComputedStyle(el).display
    }));
    const header = document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
    return { header, inputs };
  });

  console.log('Current state:', JSON.stringify(data, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
