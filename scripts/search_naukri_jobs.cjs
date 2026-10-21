const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const searchUrl = 'https://www.naukri.com/react-developer-jobs?k=react%20developer&experience=1';

  try {
    console.log('Navigating to Naukri search for React Developer (1 YOE)...');
    await p.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log('Page Title:', await p.title());

    const jobs = await p.evaluate(() => {
      const tuples = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper, .cust-job-tuple, [class*="jobTuple"]'));
      return tuples.map(t => {
        const titleAnchor = t.querySelector('a.title') || t.querySelector('a[href*="job-listings"]');
        const compAnchor = t.querySelector('a.comp-name') || t.querySelector('[class*="comp-name"]');
        const expSpan = t.querySelector('.exp-wrap') || t.querySelector('[class*="exp"]');
        const locSpan = t.querySelector('.loc-wrap') || t.querySelector('[class*="loc"]');
        const dateSpan = t.querySelector('.job-post-day') || t.querySelector('[class*="date"]') || t.querySelector('[class*="day"]');

        return {
          title: titleAnchor ? titleAnchor.innerText.trim() : null,
          url: titleAnchor ? titleAnchor.href : null,
          company: compAnchor ? compAnchor.innerText.trim() : null,
          experience: expSpan ? expSpan.innerText.trim() : null,
          location: locSpan ? locSpan.innerText.trim() : null,
          date: dateSpan ? dateSpan.innerText.trim() : null
        };
      }).filter(j => j.title && j.url);
    });

    console.log(`Found ${jobs.length} jobs in search results!`);
    console.log(JSON.stringify(jobs.slice(0, 10), null, 2));

    if (jobs.length > 0) {
      fs.writeFileSync('C:\\mcp\\job-search-mcp-engine\\naukri_search_batch.json', JSON.stringify(jobs, null, 2));
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await p.close();
  }
})();
