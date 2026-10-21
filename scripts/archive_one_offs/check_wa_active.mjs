import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const data = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    const header = main ? main.querySelector('header')?.innerText?.replace(/\n+/g, ' ') : null;
    const textSample = main ? main.innerText.slice(-300).replace(/\n+/g, ' ') : 'no main';
    return { header, textSample };
  });

  console.log('WA state:', data);
  await browser.disconnect();
}

main().catch(console.error);
