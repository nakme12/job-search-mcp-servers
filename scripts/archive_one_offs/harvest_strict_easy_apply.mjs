import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/jobs') || p.url().includes('linkedin.com'));
  if (!liPage) return;

  const searches = [
    { label: 'React Developer Easy Apply', url: 'https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3&f_TPR=r86400&keywords=%22React%22%20AND%20%22Developer%22&location=India&sortBy=DD' },
    { label: 'Frontend Developer Easy Apply', url: 'https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3&f_TPR=r86400&keywords=%22Frontend%20Developer%22&location=India&sortBy=DD' },
    { label: 'Next.js Frontend Easy Apply', url: 'https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3&f_TPR=r86400&keywords=%22Next.js%22&location=India&sortBy=DD' }
  ];

  const pool = [];

  for (const s of searches) {
    console.log(`Scanning: ${s.label}...`);
    await liPage.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    // Scroll list
    for (let i = 0; i < 5; i++) {
      await liPage.evaluate(() => {
        const pane = document.querySelector('.jobs-search-results-list');
        if (pane) pane.scrollTop += 1000;
      });
      await sleep(1500);
    }

    const cards = await liPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.jobs-search-results__list-item, .job-card-container'));
      return items.map(c => {
        const titleLink = c.querySelector('a.job-card-list__title--link, a[href*="/jobs/view/"]');
        const company = c.querySelector('.artdeco-entity-lockup__subtitle, .job-card-container__primary-description')?.innerText?.trim();
        const location = c.querySelector('.job-card-container__metadata-item')?.innerText?.trim();
        const hasEasyApply = c.innerText.includes('Easy Apply');
        const title = titleLink?.innerText?.trim();
        const url = titleLink ? titleLink.href.split('?')[0] : null;

        return { title, company, location, url, hasEasyApply };
      }).filter(x => x.title && x.url && x.hasEasyApply);
    });

    console.log(`Extracted ${cards.length} cards.`);
    cards.forEach(c => {
      if (!pool.some(p => p.url === c.url)) {
        pool.push(c);
      }
    });
  }

  // Filter strictly for Frontend / React / Next.js / Full Stack Developer roles (no Sales/Support/Backend Java)
  const validStack = pool.filter(p => {
    const t = p.title.toLowerCase();
    const bad = ['sales', 'support', 'operations', 'telecaller', 'internship', 'unpaid', 'lead', 'manager', 'senior', 'sr.'];
    if (bad.some(b => t.includes(b))) return false;
    return t.includes('react') || t.includes('frontend') || t.includes('front end') || t.includes('next') || t.includes('web developer') || t.includes('full stack') || t.includes('javascript') || t.includes('ui');
  });

  console.log(`\nFiltered ${validStack.length} strictly qualified Easy Apply roles:`);
  console.log(JSON.stringify(validStack, null, 2));

  fs.writeFileSync('scripts/strictly_easy_apply_pool.json', JSON.stringify(validStack, null, 2));
  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_easy_apply_vetted.png' });

  await browser.disconnect();
}

main().catch(console.error);
