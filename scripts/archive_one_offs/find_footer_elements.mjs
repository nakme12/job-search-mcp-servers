import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const res = await wa.evaluate(() => {
    // Look at footer
    const f = document.querySelector('footer');
    if (!f) return { error: 'No footer' };
    const elements = Array.from(f.querySelectorAll('*')).map(el => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        aria: el.getAttribute('aria-label'),
        dataTab: el.getAttribute('data-tab'),
        x: Math.round(r.x + r.width/2),
        y: Math.round(r.y + r.height/2),
        w: Math.round(r.width),
        h: Math.round(r.height),
        html: el.outerHTML.substring(0, 100)
      };
    }).filter(e => e.w > 10 && e.h > 10 && e.x < 700);

    return elements;
  });

  console.log('Footer left elements:', JSON.stringify(res, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
