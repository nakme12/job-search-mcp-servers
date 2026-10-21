import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia tab found');
      return;
    }

    // Inspect the exact form inputs on PlacementIndia
    const formDump = await page.evaluate(() => {
      const form = document.querySelector('form#applyJob, form#postResume, form[action*="apply"], form[action*="post_resume"]') || document.querySelector('form');
      if (!form) return 'No form found';
      const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder
      }));
      return { formId: form.id, formName: form.name, action: form.action, inputs };
    });
    console.log(JSON.stringify(formDump, null, 2));

  } catch (err) {
    console.error(err.message);
  }
})();
