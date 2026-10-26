const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log('[Infosys My Applications] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('career.infosys.com'));
    if (!page) {
      page = await browser.newPage();
    }
    await page.bringToFront();

    console.log('Navigating to https://career.infosys.com/jobs/myapplication...');
    await page.goto('https://career.infosys.com/jobs/myapplication', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    const title = await page.title();
    const url = page.url();
    console.log(`Landed on: ${title} (${url})`);

    // Extract all application cards, statuses, roles, reference IDs
    const applications = await page.evaluate(() => {
      // Find cards / table rows
      const cards = Array.from(document.querySelectorAll('.card, .job-card, .application-card, tr, .mat-mdc-card, .row')).map(el => {
        const text = el.innerText.trim();
        return text;
      }).filter(t => t.length > 20 && (t.toLowerCase().includes('senior') || t.toLowerCase().includes('systems') || t.toLowerCase().includes('engineer') || t.toLowerCase().includes('status') || t.toLowerCase().includes('application')));

      const fullPageText = document.body.innerText.replace(/\n+/g, ' \n ');

      return { cards: cards.slice(0, 10), fullPageSnippet: fullPageText.substring(0, 2000) };
    });

    console.log('=== MY APPLICATIONS FULL EXTRACT ===');
    console.log(JSON.stringify(applications, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
