const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!sub) {
    console.log('Supabase tab not found');
    return;
  }

  async function clickAndType(selector, text) {
    const el = await sub.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(text, { delay: 30 });
    }
  }

  console.log('Typing Name...');
  await clickAndType('input[name="_systemfield_name"]', 'Pratik Patidar');

  console.log('Typing Email...');
  await clickAndType('input[name="_systemfield_email"]', 'pratikpatidar7990@gmail.com');

  console.log('Typing Passport Country...');
  await clickAndType('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]', 'India');

  console.log('Typing Country of Residence...');
  await clickAndType('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]', 'India');

  console.log('Typing Github...');
  await clickAndType('input[name="a1a1ff15-2eef-4c24-b732-2938b7b11697"]', 'https://github.com/pratikpatidar');

  console.log('Typing Linkedin...');
  await clickAndType('input[name="e6fae51b-b49a-400b-a018-58fc83850182"]', 'https://www.linkedin.com/in/pratik-patidar');

  console.log('Clicking radios directly...');
  const radioLabels = [
    'Linkedin',
    'Some exposure',
    'Both, strong in one',
    'Single-paradigm'
  ];

  await sub.evaluate((labels) => {
    labels.forEach(lblText => {
      const allLabels = Array.from(document.querySelectorAll('label'));
      const targetLabel = allLabels.find(l => l.innerText.toLowerCase().includes(lblText.toLowerCase()));
      if (targetLabel) {
        targetLabel.click();
      }
    });
  }, radioLabels);

  console.log('Done typing and clicking.');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Checking required field status after native typing:');
  const values = await sub.evaluate(() => {
    return {
      name: document.querySelector('input[name="_systemfield_name"]')?.value,
      email: document.querySelector('input[name="_systemfield_email"]')?.value,
      passport: document.querySelector('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]')?.value,
      residence: document.querySelector('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]')?.value
    };
  });
  console.log('Values:', values);

  console.log('Submitting...');
  await sub.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));
  const confirmText = await sub.evaluate(() => document.body ? document.body.innerText : '');
  console.log('Post-submit snippet:\n', confirmText.slice(0, 300));
})();
