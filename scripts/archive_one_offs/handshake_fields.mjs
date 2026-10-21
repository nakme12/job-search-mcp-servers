import puppeteer from 'puppeteer-core';

async function checkLabels() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) {
    console.log('No page');
    await browser.disconnect();
    return;
  }

  const fields = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('label').forEach(lbl => {
      const text = lbl.innerText.replace(/\n+/g, ' ').trim();
      const forAttr = lbl.getAttribute('for');
      const input = forAttr ? document.getElementById(forAttr) : lbl.querySelector('input, select, textarea');
      list.push({
        label: text,
        inputId: input ? input.id : null,
        type: input ? input.type : null,
        tagName: input ? input.tagName : null
      });
    });
    return list;
  });

  console.log('Form Fields:', JSON.stringify(fields, null, 2));
  await browser.disconnect();
}

checkLabels().catch(console.error);
