import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');

  // Let's click attach button
  await wa.mouse.click(560, 693);
  await sleep(1500);

  // Set up fileChooser listener
  const [fileChooser] = await Promise.all([
    wa.waitForFileChooser({ timeout: 6000 }),
    wa.mouse.click(574, 394)
  ]);

  console.log('Accepting file in fileChooser...');
  await fileChooser.accept([feResume]);
  console.log('Accepted! Waiting 2s...');
  await sleep(2000);

  // Take screenshot immediately
  await wa.screenshot({ path: 'screenshots/2026-10-12/preview_immediate.png' });

  // Inspect the DOM for preview
  const previewState = await wa.evaluate(() => {
    return {
      buttons: Array.from(document.querySelectorAll('button, div[role="button"]')).map(b => ({
        text: b.innerText?.replace(/\n+/g, ' '),
        aria: b.getAttribute('aria-label'),
        rect: b.getBoundingClientRect()
      })).filter(b => b.rect.width > 0 && b.rect.y > 400)
    };
  });

  console.log('Buttons on screen during preview:', JSON.stringify(previewState, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
