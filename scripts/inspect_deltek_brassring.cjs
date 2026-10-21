const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let deltekPage = pages.find(p => p.url().includes('brassring.com'));
  
  if (!deltekPage) {
    console.log('Brassring page not found in existing tabs, opening new page...');
    deltekPage = await browser.newPage();
    await deltekPage.goto('https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25397&siteid=5259&PageType=JobDetails&jobid=622669#Applypage', { waitUntil: 'domcontentloaded', timeout: 35000 });
  } else {
    console.log('Found existing Brassring tab:', deltekPage.url());
    if (!deltekPage.url().includes('Applypage')) {
      await deltekPage.goto('https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25397&siteid=5259&PageType=JobDetails&jobid=622669#Applypage', { waitUntil: 'domcontentloaded', timeout: 35000 });
    }
  }

  await new Promise(r => setTimeout(r, 4000));
  console.log('Current URL:', deltekPage.url());
  console.log('Page Title:', await deltekPage.title());

  const info = await deltekPage.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const hasSignIn = /sign in|create an account|login|email address|password/i.test(text);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder
    }));
    return {
      hasSignIn,
      inputsLength: inputs.length,
      sampleInputs: inputs.slice(0, 10),
      textSnippet: text.slice(0, 500)
    };
  });

  console.log('Info:', JSON.stringify(info, null, 2));
})();
