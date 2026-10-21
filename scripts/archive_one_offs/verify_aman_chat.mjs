import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const msgs = await wa.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('#main [role="row"], #main [data-testid="msg-container"]'));
    return bubbles.slice(-10).map(b => b.innerText.replace(/\n+/g, ' '));
  });

  console.log('Last messages in Aman Techstuff chat:', msgs);
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_verified_receipt.png' });
  await browser.disconnect();
}

main().catch(console.error);
