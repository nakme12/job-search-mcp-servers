import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  console.log('Clicking Send button at x=970, y=930 (or [aria-label="Send 1 selected"])...');
  const clicked = await wa.evaluate(() => {
    const btn = document.querySelector('[aria-label^="Send"]') || document.querySelector('[aria-label="Send"]');
    if (btn) {
      btn.click();
      return 'clicked_aria';
    }
    return 'not_found';
  });

  console.log('DOM click result:', clicked);
  if (clicked === 'not_found') {
    // Click green circular button at bottom right: x=970, y=930
    await wa.mouse.click(970, 930);
  }

  await sleep(4000);

  // Capture final confirmed receipt
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_delivered_confirmed.png' });
  console.log('Final confirmation screenshot saved to screenshots/2026-10-12/wa_aman_both_resumes_delivered_confirmed.png');

  await browser.disconnect();
}

main().catch(console.error);
