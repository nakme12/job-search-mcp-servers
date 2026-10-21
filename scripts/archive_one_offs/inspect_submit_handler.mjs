import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  const handler = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.popup_box button, .popup_box input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('submit'));
    const form = btn ? btn.closest('form') : null;
    return {
      btnHTML: btn ? btn.outerHTML : null,
      formId: form ? form.id : null,
      formAction: form ? form.action : null,
      formEvents: form ? form.getAttribute('onsubmit') : null
    };
  });

  console.log('Form submission handler details:', handler);
  await browser.disconnect();
})();
