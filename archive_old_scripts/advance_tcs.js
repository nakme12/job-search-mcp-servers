import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tcsPage = pages.find(p => p.url().includes('Tata+Consultancy+Services') || p.url().includes('4478511534'));
  
  if (!tcsPage) {
    console.error('TCS Page not found!');
    return;
  }

  await tcsPage.bringToFront();
  console.log('Brought TCS Page to front.');

  // Click Next on page 1/4
  const nextClicked = await tcsPage.evaluate(() => {
    const nextBtn = document.querySelector('button[aria-label="Continue to next step"], footer button.artdeco-button--primary');
    if (nextBtn) {
      nextBtn.click();
      return nextBtn.innerText || 'Clicked Next';
    }
    return null;
  });

  console.log('Next clicked result:', nextClicked);
  await new Promise(r => setTimeout(r, 2000));

  await tcsPage.screenshot({ path: 'screenshots/2026-10-13/tcs_step_next.png' });
  console.log('Screenshot saved to screenshots/2026-10-13/tcs_step_next.png');

  const modalDetails = await tcsPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], .jobs-easy-apply-modal');
    if (!dialog) return 'No dialog';
    const text = dialog.innerText;
    const questions = Array.from(dialog.querySelectorAll('label, legend')).map(l => l.innerText.trim());
    return { text: text.slice(0, 600), questions };
  });

  console.log('Modal details on next step:', JSON.stringify(modalDetails, null, 2));
})();
