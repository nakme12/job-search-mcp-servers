const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    console.log('Navigating to Tricog LinkedIn job...');
    await page.goto('https://www.linkedin.com/jobs/view/4476009512/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText && b.innerText.includes('Easy Apply'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Easy Apply:', clicked);
    await new Promise(r => setTimeout(r, 2500));
    
    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('.jobs-easy-apply-modal') || document.querySelector('[role="dialog"]');
      return modal ? modal.innerText.slice(0, 1500) : 'modal not found';
    });
    console.log('Easy Apply Modal:\n', modalText);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
