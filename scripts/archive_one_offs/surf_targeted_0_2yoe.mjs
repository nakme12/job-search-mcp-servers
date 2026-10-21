import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  const searchUrls = [
    { label: 'Junior React / Frontend', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22Junior%22%20OR%20%220-2%22%20OR%20%221-2%22%20AND%20%22React%22%20AND%20%22hiring%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { label: 'React Developer Indore / MP', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22React%22%20AND%20%22Indore%22%20AND%20%22hiring%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { label: 'Frontend Developer Remote', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22Frontend%20Developer%22%20AND%20%22Remote%22%20AND%20%22hiring%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22' }
  ];

  const harvested = [];

  for (const item of searchUrls) {
    console.log(`Scanning: ${item.label}...`);
    await liPage.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    for (let scroll = 0; scroll < 5; scroll++) {
      const posts = await liPage.evaluate(() => {
        const matches = [];
        const all = document.querySelectorAll('*');
        for (const el of all) {
          if (el.innerText && el.innerText.length > 60 && el.innerText.length < 1500) {
            const t = el.innerText.toLowerCase();
            if ((t.includes('hiring') || t.includes('opening')) && (t.includes('react') || t.includes('frontend') || t.includes('mern'))) {
              const text = el.innerText.replace(/\s+/g, ' ');
              const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
              const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('feed/update') || h.includes('lnkd.in'));
              matches.push({ text, emails, links });
            }
          }
        }
        return matches;
      });

      posts.forEach(p => {
        if (!harvested.some(h => h.text.slice(0, 70) === p.text.slice(0, 70))) {
          harvested.push(p);
        }
      });

      await liPage.evaluate(() => window.scrollBy(0, 1000));
      await sleep(1500);
    }
  }

  console.log(`Total live surfed postings gathered: ${harvested.length}`);
  fs.writeFileSync('scripts/live_harvested_surfed_full.json', JSON.stringify(harvested, null, 2));

  // Take screenshot proof of surfed results
  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_feed_live_surfed.png' });
  console.log('Saved screenshot to screenshots/2026-10-12/linkedin_feed_live_surfed.png');

  await browser.disconnect();
}

main().catch(console.error);
