import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const info = await wa.evaluate(() => {
    // Check if there is a preview modal or drawer open
    const modal = document.querySelector('div[role="dialog"], [data-animate-modal-popup="true"]');
    // Check all buttons on screen
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]')).map(b => ({
      text: b.innerText?.replace(/\n+/g, ' '),
      aria: b.getAttribute('aria-label'),
      rect: b.getBoundingClientRect()
    })).filter(b => b.rect.width > 0 && b.rect.height > 0);

    return {
      hasModal: !!modal,
      modalText: modal ? modal.innerText : null,
      buttons: buttons.slice(-15)
    };
  });

  console.log('DOM State:', JSON.stringify(info, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
