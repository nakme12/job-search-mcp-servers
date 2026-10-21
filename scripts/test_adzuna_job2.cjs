const puppeteer = require('puppeteer-core');

async function testJob2Proper() {
  console.log('====================================================');
  console.log('🚀 ADZUNA RESOLVER TEST (PROPER TAB LISTENER): JOB 2');
  console.log('====================================================');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  
  // Tab cleanup: Sirf Tab 0 rakhein, baki sab close kar dein taaki koi purani tab interfere na kare
  console.log(`Current open tabs: ${pages.length}. Cleaning extra tabs...`);
  for (let i = 1; i < pages.length; i++) {
    try { 
      console.log(`Closing extra tab ${i}: ${pages[i].url()}`);
      await pages[i].close(); 
    } catch(e){}
  }
  
  const page = (await browser.pages())[0];

  const targetUrl = 'https://www.adzuna.in/details/5920569700?utm_medium=api&utm_source=22d4b243';
  console.log('\n[Step 1] Navigating Tab 0 to Adzuna Job 2:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Step 2: Handle Stage 1 Banner ("No, thanks")
  console.log('\n[Step 2] Checking for Stage 1 Email Alert banner...');
  const stage1Dismissed = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, span, div'));
    const target = btns.find(b => b.innerText && (b.innerText.trim() === 'No, thanks' || b.innerText.trim() === 'No thanks'));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  console.log('  -> Stage 1 ("No, thanks") Dismissed:', stage1Dismissed);

  // Set up targetcreated promise to capture the real newly spawned tab
  let newTargetPromise = new Promise(resolve => {
    browser.once('targetcreated', async target => {
      console.log('  [EVENT] Browser created new target:', target.url());
      const newPage = await target.page();
      resolve(newPage);
    });
  });

  // Step 3: Click "Apply for this job" trigger
  console.log('\n[Step 3] Clicking "Apply for this job" link...');
  const applyLink = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/land/ad/"]');
    if (link) {
      link.click();
      return link.href;
    }
    return null;
  });
  console.log('  -> Triggered Link:', applyLink);

  // Step 4: Handle Stage 2 Modal ("No thanks, take me to the job")
  console.log('\n[Step 4] Checking for Stage 2 Interstitial Modal ("No thanks, take me to the job")...');
  // Wait up to 5 seconds for modal to appear
  let stage2Clicked = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    stage2Clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, span, div'));
      const target = btns.find(b => b.innerText && b.innerText.trim().toLowerCase().includes('no thanks, take me to the job'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (stage2Clicked) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('  -> Stage 2 ("No thanks, take me to the job") Clicked:', stage2Clicked);

  // Step 5: Wait for the newly created tab OR current tab navigation
  console.log('\n[Step 5] Waiting for destination page to open and load...');
  let destPage = null;
  try {
    destPage = await Promise.race([
      newTargetPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
  } catch(e) {
    console.log('  -> No new tab spawned via targetcreated. Checking all open pages...');
  }

  if (!destPage) {
    const currentPages = await browser.pages();
    destPage = currentPages[currentPages.length - 1];
  }

  console.log('  -> Waiting for destination page to finish loading...');
  try {
    await destPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  } catch(e){}
  await new Promise(r => setTimeout(r, 5000));

  await destPage.bringToFront();
  const finalUrl = destPage.url();
  const finalTitle = await destPage.title();

  console.log('\n====================================================');
  console.log('🎯 ACTUAL DESTINATION PAGE RESOLVED:');
  console.log('  Final URL:', finalUrl);
  console.log('  Final Title:', finalTitle);

  const destAnalysis = await destPage.evaluate(() => {
    return {
      formsCount: document.querySelectorAll('form').length,
      fileInputsCount: document.querySelectorAll('input[type="file"]').length,
      emailInputsCount: document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]').length,
      hasApplyBtn: Array.from(document.querySelectorAll('button, a')).some(b => b.innerText && b.innerText.toLowerCase().includes('apply')),
      bodySnippet: document.body ? document.body.innerText.substring(0, 500).replace(/\n+/g, ' ') : ''
    };
  });
  console.log('  Destination Analysis:', JSON.stringify(destAnalysis, null, 2));
  console.log('====================================================\n');

  browser.disconnect();
}

testJob2Proper().catch(console.error);
