import puppeteer from 'puppeteer-core';

async function inspectSubfieldsAndSchool() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const data = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const subLabel = labels.find(l => l.innerText.includes('Which sub-field'));
    const schoolLabel = labels.find(l => l.innerText.includes('Share your school name'));

    const getElementDetails = (label) => {
      if (!label) return null;
      const parent = label.closest('div');
      const inputs = parent ? Array.from(parent.querySelectorAll('input, select, button, [role="combobox"]')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        role: el.getAttribute('role'),
        text: el.innerText || el.value
      })) : [];
      return { label: label.innerText, inputs };
    };

    return {
      subfield: getElementDetails(subLabel),
      school: getElementDetails(schoolLabel)
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.disconnect();
}

inspectSubfieldsAndSchool().catch(console.error);
