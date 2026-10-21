import puppeteer from 'puppeteer';

async function testCutshort() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  const urls = [
    'https://cutshort.io/job/React-Developer-with-ROR-Mirafra-Technologies-kFwSuaIm?utm_campaign=adzuna_jobs&utm_source=adzuna&utm_medium=organic',
    'https://cutshort.io/job/python-react-developer-Pune-Mindbowser-Infosolutions-Pvt-Ltd--0X1GjYd5?utm_campaign=adzuna_jobs&utm_source=adzuna&utm_medium=organic'
  ];

  for (const u of urls) {
    console.log('\n--- Navigating to:', u);
    await page.goto(u, { waitUntil: 'networkidle2', timeout: 30000 });
    const title = await page.title();
    console.log('Title:', title);
    const body = await page.evaluate(() => document.body ? document.body.innerText : '');
    console.log('Snippet:\n', body.substring(0, 1000));
  }

  await browser.close();
}

testCutshort().catch(console.error);
