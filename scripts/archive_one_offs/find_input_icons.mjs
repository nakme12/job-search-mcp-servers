import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const icons = await wa.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg, span[data-icon]'));
    return svgs.map(s => {
      const r = s.getBoundingClientRect();
      return {
        icon: s.getAttribute('data-icon') || s.getAttribute('aria-label') || s.tagName,
        x: Math.round(r.x + r.width/2),
        y: Math.round(r.y + r.height/2),
        w: Math.round(r.width),
        h: Math.round(r.height),
        parent: s.parentElement?.tagName
      };
    }).filter(s => s.y > 900 && s.x > 300 && s.x < 500); // bottom input area
  });

  console.log('Icons in input bar:', JSON.stringify(icons, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
