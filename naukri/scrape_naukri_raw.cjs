const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(x => x.url().includes('naukri.com')) || pages[0];

  const searchUrls = [
    { category: 'React Developer', url: 'https://www.naukri.com/react-developer-jobs?experience=0&experience=1&experience=2&jobAge=1' },
    { category: 'Frontend Developer', url: 'https://www.naukri.com/frontend-developer-jobs?experience=0&experience=1&experience=2&jobAge=1' },
    { category: 'MERN Stack Developer', url: 'https://www.naukri.com/mern-stack-developer-jobs?experience=0&experience=1&experience=2&jobAge=1' }
  ];

  const allJobsMap = new Map();

  for (const s of searchUrls) {
    console.log('Fetching:', s.category, s.url);
    await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    const jobs = await page.evaluate((cat) => {
      const items = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper, .cust-job-tuple'));
      return items.map(el => {
        const titleEl = el.querySelector('a.title');
        const compEl = el.querySelector('.comp-name, a.comp-name');
        const expEl = el.querySelector('.expwdth, .exp-wrap');
        const locEl = el.querySelector('.locWdth, .loc-wrap');
        const salEl = el.querySelector('.sal-wrap, .salary');
        const descEl = el.querySelector('.job-desc');
        const postDayEl = el.querySelector('.job-post-day');
        const tags = Array.from(el.querySelectorAll('ul.tags-gt li, .tag-li')).map(t => t.innerText.trim());

        return {
          jobId: el.getAttribute('data-job-id') || (titleEl ? titleEl.href : Math.random().toString()),
          title: titleEl ? titleEl.innerText.trim() : '',
          jobUrl: titleEl ? titleEl.href : '',
          company: compEl ? compEl.innerText.trim() : '',
          experience: expEl ? expEl.innerText.trim() : '',
          location: locEl ? locEl.innerText.trim() : '',
          salary: salEl ? salEl.innerText.trim() : 'Not disclosed',
          snippet: descEl ? descEl.innerText.trim() : '',
          postedAge: postDayEl ? postDayEl.innerText.trim() : '',
          skills: tags,
          category: cat
        };
      });
    }, s.category);

    console.log('Found ' + jobs.length + ' jobs for ' + s.category);
    for (const j of jobs) {
      if (!allJobsMap.has(j.jobId) && j.title) {
        allJobsMap.set(j.jobId, j);
      }
    }
  }

  const rawList = Array.from(allJobsMap.values());
  console.log('Total unique raw jobs collected:', rawList.length);
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/raw_naukri_jobs.json', JSON.stringify(rawList, null, 2));

  browser.disconnect();
}

run().catch(console.error);
