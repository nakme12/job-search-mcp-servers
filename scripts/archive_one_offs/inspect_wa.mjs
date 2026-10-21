import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.log('No WA tab');
    await browser.disconnect();
    return;
  }

  const info = await wa.evaluate(() => {
    const header = document.querySelector('header');
    const main = document.querySelector('#main');
    const rows = document.querySelectorAll('div[role="row"]');
    const inputs = document.querySelectorAll('input[type="file"]');
    return {
      headerText: header ? header.innerText.replace(/\n+/g, ' | ') : null,
      hasMain: !!main,
      mainTextSample: main ? main.innerText.slice(-250).replace(/\n+/g, ' | ') : null,
      rowCount: rows.length,
      fileInputCount: inputs.length,
      fileInputDetails: Array.from(inputs).map(i => ({ accept: i.accept, id: i.id }))
    };
  });

  console.log('WhatsApp Live Status:', JSON.stringify(info, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
