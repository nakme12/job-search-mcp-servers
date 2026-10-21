const puppeteer = require('puppeteer-core');

async function traceAdzuna() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];

  console.log('Current Adzuna Page URL:', page.url());
  console.log('Clicking "Apply for this job" trigger...');

  // Set up target created listener for new popup tab if opened
  const newPagePromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));

  const clicked = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/land/ad/"]');
    if (link) {
      link.click();
      return link.href;
    }
    return null;
  });

  console.log('Clicked Link:', clicked);

  // Wait for redirect in same page or new tab
  let destPage = await Promise.race([
    newPagePromise,
    new Promise(r => setTimeout(r, 6000)).then(() => page)
  ]);

  if (!destPage) destPage = (await browser.pages())[ (await browser.pages()).length - 1 ];

  await new Promise(r => setTimeout(r, 6000));
  await destPage.bringToFront();

  console.log('----------------------------------------------------');
  console.log('📍 DESTINATION RESOLVED:');
  console.log('URL:', destPage.url());
  console.log('Title:', await destPage.title());
  
  // Inspect Form & Apply presence
  const formAnalysis = await destPage.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const emailInputs = Array.from(document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]'));
    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
    const applyButtons = Array.from(document.querySelectorAll('button, a'))
      .map(b => b.innerText.trim())
      .filter(t => t.toLowerCase().includes('apply') && t.length < 35);

    return {
      formsCount: forms.length,
      fileInputsCount: fileInputs.length,
      emailInputsCount: emailInputs.length,
      iframesCount: iframes.length,
      iframeSources: iframes.slice(0, 3),
      applyButtons: Array.from(new Set(applyButtons))
    };
  });

  console.log('Destination Form Analysis:', JSON.stringify(formAnalysis, null, 2));
  console.log('----------------------------------------------------');

  browser.disconnect();
}

traceAdzuna().catch(console.error);
