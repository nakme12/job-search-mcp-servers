const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const url = 'https://www.zaax.com/submit-resume/';

  try {
    console.log(`Opening ZAAX submit-resume: ${url}`);
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    const formInfo = await p.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        required: el.required
      }));

      const labels = Array.from(document.querySelectorAll('label')).map(l => l.innerText.trim()).filter(Boolean);

      return {
        title: document.title,
        inputs: inputs,
        labels: labels
      };
    });

    console.log('Title:', formInfo.title);
    console.log('Labels:', formInfo.labels);
    console.log('Inputs:', JSON.stringify(formInfo.inputs, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await p.close();
  }
})();
