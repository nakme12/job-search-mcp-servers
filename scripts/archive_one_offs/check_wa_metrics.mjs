import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const vp = wa.viewport();
  const metrics = await wa.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio
  }));

  console.log('Viewport:', vp, 'Metrics:', metrics);
  await browser.disconnect();
}

main().catch(console.error);
