import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const html = await wa.evaluate(() => {
    const pane = document.querySelector('#pane-side');
    if (!pane) return 'no pane';
    const spans = Array.from(pane.querySelectorAll('span'));
    const target = spans.find(s => s.innerText === 'Aman Techstuff');
    if (!target) return 'target span not found';
    const parentRow = target.closest('div[role="listitem"]') || target.closest('div[tabindex]') || target.parentElement;
    return parentRow ? parentRow.outerHTML.slice(0, 800) : 'no parent';
  });

  console.log('Target row HTML:', html);
  await browser.disconnect();
}

main().catch(console.error);
