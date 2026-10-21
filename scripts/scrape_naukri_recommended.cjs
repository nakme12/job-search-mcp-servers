const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Naukri Recommended Jobs...');
    await p.goto('https://www.naukri.com/mnjuser/recommendedjobs', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log('Title:', await p.title());
    console.log('URL:', p.url());

    const jobs = await p.evaluate(() => {
      // Find all job articles/cards on the page
      const selectors = ['.tuple', '.jobTuple', '.srp-jobtuple-wrapper', 'article', '[data-job-id]'];
      const cards = Array.from(document.querySelectorAll(selectors.join(',')));
      
      const res = [];
      const seen = new Set();

      for (const card of cards) {
        const titleAnchor = card.querySelector('a.title') || card.querySelector('a[href*="job-listings"]');
        if (!titleAnchor) continue;
        const url = titleAnchor.href.split('?')[0];
        if (seen.has(url)) continue;
        seen.add(url);

        const companyEl = card.querySelector('a.comp-name') || card.querySelector('[class*="comp-name"]') || card.querySelector('[class*="company"]');
        const expEl = card.querySelector('.exp-wrap') || card.querySelector('[class*="exp"]');
        const locEl = card.querySelector('.loc-wrap') || card.querySelector('[class*="loc"]');
        const salaryEl = card.querySelector('.sal-wrap') || card.querySelector('[class*="sal"]');

        res.push({
          title: titleAnchor.innerText.trim(),
          url: url,
          company: companyEl ? companyEl.innerText.trim() : 'Unknown',
          experience: expEl ? expEl.innerText.trim() : 'Not specified',
          location: locEl ? locEl.innerText.trim() : 'Not specified',
          salary: salaryEl ? salaryEl.innerText.trim() : 'Not disclosed'
        });
      }
      return res;
    });

    console.log(`Found ${jobs.length} Recommended Jobs!`);
    console.log(JSON.stringify(jobs.slice(0, 15), null, 2));

    if (jobs.length > 0) {
      fs.writeFileSync('C:\\mcp\\job-search-mcp-engine\\naukri_recommended_jobs.json', JSON.stringify(jobs, null, 2));
      console.log('Saved to C:\\mcp\\job-search-mcp-engine\\naukri_recommended_jobs.json');
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await p.close();
  }
})();
