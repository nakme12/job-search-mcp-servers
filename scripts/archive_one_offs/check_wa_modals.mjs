import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const appState = await wa.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('div[data-animate-modal-popup="true"], div[role="dialog"]')).map(m => m.innerText.slice(0, 100));
    return {
      modals,
      viewBox: { w: window.innerWidth, h: window.innerHeight }
    };
  });

  console.log('App state:', appState);
  await browser.disconnect();
}

main().catch(console.error);
