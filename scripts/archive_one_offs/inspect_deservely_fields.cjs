const puppeteer = require('puppeteer-core');

async function inspectDeservelyFields() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[pages.length - 1];

  const fields = await p.evaluate(() => {
    const list = [];
    document.querySelectorAll('.fb-dash-form-element, .jobs-easy-apply-form-section__grouping').forEach(el => {
      const text = el.innerText.trim();
      const input = el.querySelector('input');
      const select = el.querySelector('select');
      list.push({
        label: text.split('\n')[0],
        inputId: input ? input.id : null,
        selectId: select ? select.id : null,
        options: select ? Array.from(select.options).map(o => o.text) : []
      });
    });
    return list;
  });

  console.log('Deservely Question Fields:\n', JSON.stringify(fields, null, 2));
}

inspectDeservelyFields().catch(console.error);
