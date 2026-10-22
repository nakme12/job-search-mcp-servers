const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();

    // BooksApp on Cutshort
    const booksAppUrl = 'https://cutshort.io/job/React-Developer-Bengaluru-Bangalore-BooksApp-h2QpUaCR?utm_campaign=adzuna_jobs&utm_source=adzuna&utm_medium=organic';
    console.log('[Audit 1] Opening BooksApp on Cutshort:', booksAppUrl);
    await page.goto(booksAppUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const audit1 = await page.evaluate(() => {
      const title = document.querySelector('h1, .job-title')?.innerText?.trim() || document.title;
      const exp = document.body.innerText.match(/(\d+[\s–-]*\d*\s*(?:years?|yrs?|yr))/i)?.[0] || 'Not explicitly found';
      const isExpired = document.body.innerText.includes('This job is no longer active') || document.body.innerText.includes('Job closed') || document.body.innerText.includes('Application closed');
      const salary = document.body.innerText.match(/₹[\d,.]+\s*(?:LPA|lpa|-|to)/i)?.[0] || 'Not specified';
      const applyBtn = Array.from(document.querySelectorAll('button, a')).some(b => b.innerText.toLowerCase().includes('apply'));
      const snippet = document.body.innerText.substring(0, 800).replace(/\n+/g, ' ');


      return { title, exp, isExpired, salary, snippet: snippet.substring(0, 400) };
    });

    console.log('\n================ BOOKSAPP CUTSHORT AUDIT ================');
    console.log('Title:', audit1.title);
    console.log('Detected Exp:', audit1.exp);
    console.log('Is Expired/Closed?:', audit1.isExpired);
    console.log('Salary:', audit1.salary);
    console.log('Live Snippet:', audit1.snippet);

    await page.close();
  } catch (err) {
    console.error('Audit Error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
