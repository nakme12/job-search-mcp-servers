const puppeteer = require('puppeteer-core');

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://www.instahyre.com/job-417373-full-stack-developer-intern-at-aelyx-indore/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));
  
  const btn = await page.$('#job_details_top');
  if (btn) {
    await btn.click();
    await new Promise(r => setTimeout(r, 3000));
    console.log('URL after click:', page.url());
    const authText = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content, .auth-modal, #candidate-login-modal');
      return modal ? modal.innerText : 'No auth modal';
    });
    console.log('Auth text:\n', authText);
  }
  await page.close();
}

main().catch(console.error);
