import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const debug = await wa.evaluate(() => {
    return {
      bodyHtmlSnippet: document.body.innerHTML.slice(0, 1500),
      allDivsWithRole: Array.from(document.querySelectorAll('div[role]')).map(d => ({
        role: d.getAttribute('role'),
        ariaLabel: d.getAttribute('aria-label'),
        textSnippet: d.innerText ? d.innerText.slice(0, 50).replace(/\n+/g, ' ') : ''
      }))
    };
  });

  console.log('Divs with role:', debug.allDivsWithRole.slice(0, 20));
  await browser.disconnect();
}

main().catch(console.error);
