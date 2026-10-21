const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const ramp = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!ramp) {
    console.log('Ramp not found');
    return;
  }
  const info = await ramp.evaluate(() => {
    const errorContainers = Array.from(document.querySelectorAll('*')).filter(el => {
      const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
      return cls.includes('error') || el.getAttribute('aria-invalid') === 'true';
    });
    const errorTexts = errorContainers.map(e => e.innerText ? e.innerText.trim() : '').filter(t => t.length > 0 && t.length < 200);

    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => {
      return {
        id: el.id,
        name: el.name,
        type: el.type,
        required: el.required,
        value: el.value ? el.value.slice(0, 30) : '',
        valid: el.checkValidity ? el.checkValidity() : true
      };
    }).filter(x => x.type !== 'hidden');

    return { errorTexts: Array.from(new Set(errorTexts)), inputs };
  });

  console.log('Errors:', info.errorTexts);
  console.log('Required & Invalid inputs:');
  info.inputs.filter(i => i.required && !i.valid).forEach(i => console.log('  ->', i));
  console.log('All required inputs:');
  info.inputs.filter(i => i.required).forEach(i => console.log('  [req]', i.name || i.id, 'val:', i.value, 'valid:', i.valid));
})();
