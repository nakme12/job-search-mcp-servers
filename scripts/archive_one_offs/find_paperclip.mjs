import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const res = await wa.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('footer svg, [data-icon="plus"]'));
    return svgs.map(s => {
      const r = s.getBoundingClientRect();
      const parent = s.closest('button, [role="button"]');
      return {
        tag: s.tagName,
        icon: s.getAttribute('data-icon') || parent?.getAttribute('aria-label'),
        x: Math.round(r.x + r.width/2),
        y: Math.round(r.y + r.height/2),
        parentHtml: parent ? parent.outerHTML.substring(0, 100) : null
      };
    });
  });

  console.log('SVGs found:', JSON.stringify(res, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
