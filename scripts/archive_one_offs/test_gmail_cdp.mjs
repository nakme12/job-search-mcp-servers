import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmailPages = pages.filter(p => p.url().includes('mail.google.com'));
  console.log(`Found ${gmailPages.length} Gmail tabs:`);
  for (let i = 0; i < gmailPages.length; i++) {
    console.log(`[${i}] ${gmailPages[i].url()} - ${await gmailPages[i].title()}`);
  }
  
  const page = gmailPages[0];
  await page.bringToFront();
  
  const composeInfo = await page.evaluate(() => {
    const compBtn = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"], .T-I.T-I-KE');
    const composeBoxes = document.querySelectorAll('div[role="dialog"], div.M9, div.AD');
    return {
      hasComposeBtn: !!compBtn,
      composeBtnText: compBtn ? compBtn.innerText : null,
      openDialogs: composeBoxes.length
    };
  });
  console.log('Compose info:', composeInfo);

  browser.disconnect();
}

test().catch(console.error);
