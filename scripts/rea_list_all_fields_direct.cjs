const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().startsWith('https://79371.aidaform.com/atlantis'));

    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, canvas, button'));
      return inputs.map((el, idx) => {
        let label = '';
        if (el.id) {
          const l = document.querySelector(`label[for="${el.id}"]`);
          if (l) label = l.innerText.trim();
        }
        if (!label && el.parentElement) {
          label = el.parentElement.innerText.trim();
        }
        return {
          idx,
          tag: el.tagName,
          id: el.id,
          name: el.name,
          type: el.type,
          value: el.value,
          checked: el.checked,
          label
        };
      });
    });

    console.log(JSON.stringify(fields, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
