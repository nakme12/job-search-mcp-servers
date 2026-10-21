const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to https://www.naukri.com/mnjuser/recommendedjobs...');
    await p.goto('https://www.naukri.com/mnjuser/recommendedjobs', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL:', p.url());
    console.log('Page Title:', await p.title());

    // Extract all job cards
    const jobs = await p.evaluate(() => {
      const allAnchors = Array.from(document.querySelectorAll('a[href*="job-listings"]'));
      const seen = new Set();
      const list = [];

      for (const a of allAnchors) {
        const url = a.href.split('?')[0];
        if (seen.has(url)) continue;
        seen.add(url);

        let parent = a.closest('div[class*="tuple"], article, li, div[class*="card"], div[class*="Tuple"]') || a.parentElement;
        let text = parent ? parent.innerText.replace(/\n+/g, ' | ') : a.innerText;

        list.push({
          title: a.innerText.trim() || 'Untitled',
          url: a.href,
          cardSnippet: text.slice(0, 300)
        });
      }
      return list;
    });

    console.log(`Extracted ${jobs.length} jobs from Recommended page!`);
    console.log(JSON.stringify(jobs.slice(0, 15), null, 2));

    if (jobs.length > 0) {
      fs.writeFileSync('C:\\mcp\\job-search-mcp-engine\\naukri_rec_list.json', JSON.stringify(jobs, null, 2));
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await p.close();
  }
})();
