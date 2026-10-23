const puppeteer = require('puppeteer-core');

async function inspectFiberKeys() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  const fiberReport = await page.evaluate(() => {
    const textarea = document.querySelector('textarea[name="4f7971df-d94f-418a-8ae3-b15e84836e5b"]');
    if (!textarea) return 'NO_TEXTAREA';
    const keys = Object.keys(textarea);
    const fiberKey = keys.find(k => k.startsWith('__reactFiber$'));
    const propsKey = keys.find(k => k.startsWith('__reactProps$'));
    const fiber = fiberKey ? textarea[fiberKey] : null;
    const props = propsKey ? textarea[propsKey] : null;
    return {
      keys,
      hasFiber: !!fiber,
      hasProps: !!props,
      propsOnChange: props && typeof props.onChange === 'function'
    };
  });
  console.log('Fiber report:', JSON.stringify(fiberReport, null, 2));
  await browser.disconnect();
}
inspectFiberKeys().catch(console.error);
