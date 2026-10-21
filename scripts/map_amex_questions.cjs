const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const amex = pages.find(p => p.url().includes('oraclecloud.com'));
  if (!amex) {
    console.log('AmEx not found');
    return;
  }
  const questions = await amex.evaluate(() => {
    const qEls = Array.from(document.querySelectorAll('.oj-radioset, fieldset, [role="radiogroup"]'));
    return qEls.map(q => {
      const legend = q.querySelector('legend, label, .oj-radioset-label');
      const qText = legend ? legend.innerText.trim() : 'Unknown Q';
      const options = Array.from(q.querySelectorAll('input[type="radio"]')).map(r => {
        const l = q.querySelector('label[for="' + r.id + '"]') || document.querySelector('label[for="' + r.id + '"]');
        return { id: r.id, val: r.value, label: l ? l.innerText.trim() : '' };
      });
      return { qText, options };
    });
  });
  console.log('Total Questions:', questions.length);
  questions.forEach((q, i) => {
    console.log(`Q${i+1}: ${q.qText}`);
    q.options.forEach(o => console.log(`   [${o.id}] ${o.label}`));
  });
})();
