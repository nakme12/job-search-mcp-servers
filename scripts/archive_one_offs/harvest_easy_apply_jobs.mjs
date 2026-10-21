import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/search') || p.url().includes('linkedin.com'));

  if (!liPage) {
    console.error('LinkedIn tab not found');
    await browser.disconnect();
    return;
  }

  // Search URLs for Easy Apply: React, Frontend, MERN with past 24h & Easy Apply filter (f_AL=true)
  const searchQueries = [
    { label: 'React Developer Easy Apply (India)', url: 'https://www.linkedin.com/jobs/search/?f_AL=true&f_TPR=r86400&keywords=React%20Developer&location=India&sortBy=DD' },
    { label: 'Frontend Developer Easy Apply (India)', url: 'https://www.linkedin.com/jobs/search/?f_AL=true&f_TPR=r86400&keywords=Frontend%20Developer&location=India&sortBy=DD' },
    { label: 'Next.js Developer Easy Apply (India/Remote)', url: 'https://www.linkedin.com/jobs/search/?f_AL=true&f_TPR=r86400&keywords=Next.js&location=India&sortBy=DD' }
  ];

  const harvestedJobs = [];

  for (const q of searchQueries) {
    console.log(`\nNavigating to: ${q.label}...`);
    await liPage.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    // Scroll the job list pane
    for (let scroll = 0; scroll < 4; scroll++) {
      await liPage.evaluate(() => {
        const pane = document.querySelector('.jobs-search-results-list') || document.querySelector('.scaffold-layout__list-detail-inner');
        if (pane) pane.scrollTop += 800;
        else window.scrollBy(0, 800);
      });
      await sleep(1500);
    }

    // Extract all job cards visible in search
    const jobs = await liPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, div[data-job-id]'));
      return cards.map(c => {
        const titleEl = c.querySelector('.job-card-list__title--link, a[href*="/jobs/view/"], strong');
        const companyEl = c.querySelector('.artdeco-entity-lockup__subtitle, .job-card-container__primary-description');
        const locationEl = c.querySelector('.job-card-container__metadata-item');
        const linkEl = c.querySelector('a[href*="/jobs/view/"]');
        const easyApplyBadge = c.innerText.includes('Easy Apply');

        return {
          title: titleEl?.innerText?.trim(),
          company: companyEl?.innerText?.trim(),
          location: locationEl?.innerText?.trim(),
          url: linkEl ? linkEl.href.split('?')[0] : null,
          isEasyApply: easyApplyBadge
        };
      }).filter(j => j.title && j.url);
    });

    console.log(`Found ${jobs.length} jobs in this query.`);
    jobs.forEach(j => {
      if (!harvestedJobs.some(h => h.url === j.url)) {
        harvestedJobs.push(j);
      }
    });
  }

  console.log(`\nTotal unique Easy Apply jobs found: ${harvestedJobs.length}`);
  fs.writeFileSync('scripts/live_easy_apply_scraped.json', JSON.stringify(harvestedJobs, null, 2));

  // Save screenshot proof
  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_easy_apply_harvest.png' });
  console.log('Saved screenshot proof to screenshots/2026-10-12/linkedin_easy_apply_harvest.png');

  await browser.disconnect();
}

main().catch(console.error);
