const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function debugFigmaGreenhouse() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  console.log('Navigating to Figma Greenhouse...');
  await page.goto('https://job-boards.greenhouse.io/figma/jobs/6219995004?gh_jid=6219995004', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const analysis = await page.evaluate(() => {
    const hasCaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], #cf-turnstile');
    const submitBtn = document.querySelector('button[type="submit"], #submit_app');
    return {
      title: document.title,
      hasCaptcha,
      submitBtnText: submitBtn ? submitBtn.innerText.trim() : null
    };
  });

  console.log('Figma GH Analysis:', JSON.stringify(analysis, null, 2));
  await page.close();
}

debugFigmaGreenhouse().catch(console.error);
