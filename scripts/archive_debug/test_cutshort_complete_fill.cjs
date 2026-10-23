const puppeteer = require('puppeteer-core');

async function testSubmit() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const target = pages.find(p => p.url().includes('cutshort.io/profile/all-jobs'));
  if (!target) {
    console.log('No Cutshort job page found');
    return;
  }

  console.log('Target found:', target.url());

  // 1. Set Notice Period using React-compatible prototype setter
  await target.evaluate(() => {
    const inp = document.querySelector('input[name="canJoinHowSoon"]');
    if (inp) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '15');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 2. Check Declaration Checkbox
    const label = Array.from(document.querySelectorAll('label')).find(l => l.innerText && l.innerText.includes('I hereby declare'));
    if (label) {
      label.click();
    }
  });

  console.log('Filled notice period and checked declaration.');
  await new Promise(r => setTimeout(r, 1000));

  // 3. Click Save and continue
  await target.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Save and continue');
    if (btn) btn.click();
  });

  console.log('Clicked Save and continue. Waiting 5s...');
  await new Promise(r => setTimeout(r, 5000));

  const status = await target.evaluate(() => {
    const body = document.body ? document.body.innerText : '';
    const isModalOpen = Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.trim() === 'Save and continue');
    return {
      isModalOpen,
      url: window.location.href,
      snippet: body.substring(0, 500).replace(/\s+/g, ' ')
    };
  });

  console.log('Status after submit:', JSON.stringify(status, null, 2));
}

testSubmit().catch(console.error);
