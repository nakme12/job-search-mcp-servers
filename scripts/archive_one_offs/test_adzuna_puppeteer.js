import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({ 
    headless: false, // run with real head so AWS WAF challenge evaluates scripts and passes
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  const adzunaUrl = 'https://www.adzuna.in/details/5913885939?utm_medium=api&utm_source=22d4b243';
  await page.goto(adzunaUrl, { waitUntil: 'networkidle2' });

  const applyHref = await page.evaluate(() => {
    const a = document.querySelector('a[data-js="apply"]');
    return a ? a.href : null;
  });
  console.log('Apply href:', applyHref);

  await page.goto(applyHref, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Navigated. Waiting 5s for challenge solve...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('Final URL after wait:', page.url());
  console.log('Final page title:', await page.title());
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 500) : '');
  console.log('Final body snippet:\n', bodyText);

  await browser.close();
}

test().catch(console.error);
