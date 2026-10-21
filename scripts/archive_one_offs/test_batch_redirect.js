import puppeteer from 'puppeteer';

async function testOthers() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  const urls = [
    { id: 4, company: 'Acme Services', url: 'https://www.adzuna.in/details/5917523560?utm_medium=api&utm_source=22d4b243' },
    { id: 5, company: 'Mirafra Technologies', url: 'https://www.adzuna.in/details/5918889158?utm_medium=api&utm_source=22d4b243' },
    { id: 6, company: 'MindBowser', url: 'https://www.adzuna.in/details/5918929351?utm_medium=api&utm_source=22d4b243' }
  ];

  for (const item of urls) {
    console.log(`\n--- Testing [${item.id}] ${item.company} ---`);
    await page.goto(item.url, { waitUntil: 'networkidle2' });
    
    // Check apply link attributes
    const applyInfo = await page.evaluate(() => {
      const a = document.querySelector('a[data-js="apply"]');
      if (!a) return null;
      return {
        href: a.href,
        text: a.innerText,
        ga4: a.getAttribute('data-ga4-track'),
        classes: a.className
      };
    });
    console.log('Apply Info:', applyInfo);

    if (applyInfo && applyInfo.href) {
      await page.goto(applyInfo.href, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());
    }
  }

  await browser.close();
}

testOthers().catch(console.error);
