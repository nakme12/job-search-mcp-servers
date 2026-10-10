const puppeteer = require('puppeteer-core');

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const page = (await browser.pages()).find(p => p.url().includes('4446731371'));
  const inputs = await page.evaluate(() => {
    const list = [];
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(el => {
      if (el.type === 'hidden') return;
      const id = el.id;
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      let context = '';
      let p = el.parentElement;
      for (let i = 0; i < 5 && p; i++) {
        if (p.innerText && p.innerText.length > context.length && p.innerText.length < 500) {
          context = p.innerText;
        }
        p = p.parentElement;
      }
      list.push({
        id,
        tagName: el.tagName,
        type: el.type,
        value: el.value,
        labelText: label ? label.innerText.trim() : null,
        context: context.trim(),
        options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => o.text) : undefined
      });
    });
    return list;
  });

  console.log(JSON.stringify(inputs, null, 2));
  browser.disconnect();
}

main().catch(console.error);
