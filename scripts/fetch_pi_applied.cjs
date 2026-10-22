const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  await p.goto('https://jobseeker.placementindia.com/?id=view_applied_jobs', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const appliedJobs = await p.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="job-detail"]')).map(a => a.href);
    const titles = Array.from(document.querySelectorAll('h3, h4, .job-title')).map(el => el.innerText.trim());
    return {
      links: Array.from(new Set(links)),
      titles: Array.from(new Set(titles))
    };
  });

  console.log('Already applied count on PI:', appliedJobs.links.length);
  fs.writeFileSync('C:/mcp/pi_already_applied_links.json', JSON.stringify(appliedJobs, null, 2));

  // Now cross-reference with harvest
  const harvest = JSON.parse(fs.readFileSync('C:/mcp/placementindia_harvested_jobs.json', 'utf8'));
  const appliedSet = new Set(appliedJobs.links.map(l => l.toLowerCase().split('?')[0]));

  const trueUnapplied = harvest.filter(j => {
    const u = (j.jobUrl || '').toLowerCase().split('?')[0];
    return !appliedSet.has(u);
  });

  console.log(`Harvested: ${harvest.length} | Already applied on PI: ${appliedJobs.links.length} | Pure Unapplied: ${trueUnapplied.length}`);
  fs.writeFileSync('C:/mcp/placementindia_true_unapplied.json', JSON.stringify(trueUnapplied, null, 2), 'utf8');

  trueUnapplied.slice(0, 10).forEach((j, i) => {
    console.log(`[Unapplied ${i+1}] ${j.company} — ${j.title} (${j.location}) -> ${j.jobUrl}`);
  });

  await p.close();
  await b.disconnect();
})();
