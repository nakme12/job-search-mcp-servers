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

  const formData = await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    if (!popup) return null;
    const inputs = Array.from(popup.querySelectorAll('input:not([type="hidden"]), select, textarea')).map(el => ({
      tag: el.tagName,
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder,
      value: el.value,
      options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => ({ val: o.value, text: o.text })) : undefined
    }));
    return inputs;
  });

  console.log('Form Elements:', JSON.stringify(formData, null, 2));
  await browser.disconnect();
})();
