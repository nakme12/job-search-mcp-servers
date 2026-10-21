import puppeteer from 'puppeteer-core';

async function checkSubfield() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const data = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const subfieldLabel = labels.find(l => l.innerText.toLowerCase().includes('subfield') || l.innerText.toLowerCase().includes('describe your background'));
    let subfieldInfo = null;
    if (subfieldLabel) {
      const parent = subfieldLabel.closest('div');
      const btn = parent ? parent.querySelector('[role="combobox"], button, select') : null;
      subfieldInfo = {
        labelText: subfieldLabel.innerText,
        tag: btn ? btn.tagName : null,
        id: btn ? btn.id : null,
        text: btn ? btn.innerText : null
      };
    }
    const allLabels = labels.map(l => l.innerText.replace(/\n+/g, ' ').trim());
    return { subfieldInfo, allLabels };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.disconnect();
}

checkSubfield().catch(console.error);
