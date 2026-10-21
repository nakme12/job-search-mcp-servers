import puppeteer from 'puppeteer';
import fs from 'fs';

async function checkJob2() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  await page.goto('https://www.adzuna.in/details/5916812633?utm_medium=api&utm_source=22d4b243', { waitUntil: 'domcontentloaded' });
  console.log('Adzuna title:', await page.title());

  const applyHref = await page.evaluate(() => {
    const a = document.querySelector('a[data-js="apply"]');
    return a ? a.href : null;
  });
  console.log('Apply href:', applyHref);

  if (applyHref) {
    await page.goto(applyHref, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 5000));
    console.log('Final URL:', page.url());
    console.log('Final title:', await page.title());
    const destBody = await page.evaluate(() => document.body ? document.body.innerText : '');
    console.log('Dest snippet:\n', destBody.substring(0, 600));

    // Update dropped file with exact reason
    const DROPPED_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_destination_dropped_final.json';
    const dropped = JSON.parse(fs.readFileSync(DROPPED_FILE, 'utf8'));
    const item = dropped.find(d => d.id === 2);
    if (item) {
      item.destination_url = page.url();
      item.destination_title = await page.title();
      // Check date and YOE
      if (destBody.includes('2021') || destBody.includes('2022') || destBody.includes('2020') || destBody.includes('2018') || destBody.includes('2019') || destBody.includes('2023') || destBody.includes('2024') || destBody.includes('2025')) {
        item.drop_reason = 'Stale posted date on destination (Posted in past year)';
      } else if (destBody.includes('years') || destBody.includes('yrs')) {
        item.drop_reason = 'Over experience on destination or stale';
      }
      fs.writeFileSync(DROPPED_FILE, JSON.stringify(dropped, null, 2));
    }
  }

  await browser.close();
}

checkJob2().catch(console.error);
