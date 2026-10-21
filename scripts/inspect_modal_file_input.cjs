const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Trigger modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
    if (btn) ['mousedown', 'mouseup', 'click'].forEach(e => btn.dispatchEvent(new MouseEvent(e, { bubbles: true })));
  });
  await new Promise(r => setTimeout(r, 3000));

  // Inspect the Upload resume element and all file inputs
  const fileDetails = await page.evaluate(() => {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(i => ({
      name: i.name,
      id: i.id,
      className: i.className,
      style: i.getAttribute('style')
    }));

    const uploadBtn = Array.from(document.querySelectorAll('span, a, button, div, label')).find(el => el.innerText && el.innerText.trim() === 'Upload resume');

    return {
      fileInputs,
      uploadBtnTag: uploadBtn ? uploadBtn.tagName : null,
      uploadBtnParentTag: uploadBtn && uploadBtn.parentElement ? uploadBtn.parentElement.tagName : null,
      uploadBtnParentHTML: uploadBtn && uploadBtn.parentElement ? uploadBtn.parentElement.outerHTML : null
    };
  });

  console.log('File Upload Details in Modal:\n', JSON.stringify(fileDetails, null, 2));
  await page.close();
  browser.disconnect();
})();
