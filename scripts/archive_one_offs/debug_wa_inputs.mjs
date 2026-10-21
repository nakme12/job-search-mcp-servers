import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const info = await wa.evaluate(() => {
    const list = document.querySelectorAll('input[type="file"]');
    return Array.from(list).map((input, index) => ({
      index,
      accept: input.accept,
      multiple: input.multiple,
      style: input.getAttribute('style')
    }));
  });

  console.log('Inputs info:', info);
  await browser.disconnect();
}

main().catch(console.error);
