import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("=== DEEP DESTINATION LANDING AUDIT FOR ADZUNA JOBS ===");
  
  const pool = JSON.parse(fs.readFileSync('scripts/slot4_verified_all_active.json', 'utf8'));
  const adzunaJobs = pool.filter(p => p.source.includes('Adzuna'));
  console.log(`Auditing destination landing pages for ${adzunaJobs.length} Adzuna listings...`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const verifiedDestinationClean = [];
  const droppedStaleDestinations = [];

  for (let i = 0; i < adzunaJobs.length; i++) {
    const job = adzunaJobs[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[${i+1}/${adzunaJobs.length}] Destination Check: ${job.company} - ${job.role}`);
    console.log(`Adzuna URL: ${job.url}`);

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(1500);

      // Dismiss popup
      await page.evaluate(() => {
        const noThanks = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('No, thanks'));
        if (noThanks) noThanks.click();
      });
      await sleep(500);

      // Get real landing / apply redirect link
      const redirectHref = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/land/ad/"], a.apply-button, a[data-aid="apply-button"]');
        return link ? link.href : null;
      });

      if (!redirectHref) {
        console.log(`  -> [DROP] Could not resolve apply redirect link on Adzuna`);
        droppedStaleDestinations.push({ ...job, dropReason: 'No redirect link' });
        continue;
      }

      console.log(`  -> Following redirect to real landing page...`);
      await page.goto(redirectHref, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(3000);

      const finalUrl = page.url();
      console.log(`  -> Destination URL: ${finalUrl}`);

      const landingAnalysis = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const lower = bodyText.toLowerCase();

        // 1. Is Closed
        const isClosed = /job has expired|no longer accepting applications|job is closed|page not found|404|expired|this job is no longer available|position has been filled/i.test(bodyText);

        // 2. Exact Posted Date
        const dateMatch = bodyText.match(/posted\s*(?:on|:)?\s*([a-zA-Z0-9,\s]+ago|\d{1,2}\s+[a-zA-Z]+\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
        const postedText = dateMatch ? dateMatch[0].trim() : 'Date not stated';

        // Check years in date match or body
        const isOldYear = /2020|2021|2022|2023|2024|2025/i.test(postedText) || /posted\s*\d+\s*(?:months?|years?)\s*ago/i.test(lower);
        const isPastFewDays = /hours?|today|yesterday|1 day|2 days|3 days|4 days|5 days|6 days|7 days|1 week/i.test(postedText);

        // 3. Stated Experience on Destination
        const expMatch = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/i);
        let minExp = 0;
        let expText = 'Not specified';
        if (expMatch) {
          minExp = parseInt(expMatch[1], 10);
          expText = `${minExp}${expMatch[2] ? '-' + expMatch[2] : '+'} YOE`;
        }

        return {
          isClosed,
          isOldYear,
          isPastFewDays,
          postedText,
          expText,
          minExp,
          title: document.title
        };
      });

      console.log(`  -> Landing Date: "${landingAnalysis.postedText}" | OldYear: ${landingAnalysis.isOldYear} | Closed: ${landingAnalysis.isClosed} | Exp: ${landingAnalysis.expText}`);

      if (landingAnalysis.isClosed || landingAnalysis.isOldYear || landingAnalysis.minExp >= 3) {
        console.log(`  -> [DROP] Stale/Closed/OverExp on destination!`);
        droppedStaleDestinations.push({
          ...job,
          finalUrl,
          destinationDate: landingAnalysis.postedText,
          destinationExp: landingAnalysis.expText,
          dropReason: landingAnalysis.isClosed ? 'Closed' : (landingAnalysis.isOldYear ? 'Old Year/Stale' : 'OverExp')
        });
      } else {
        console.log(`  -> [PASS] Verified genuine fresh destination!`);
        verifiedDestinationClean.push({
          ...job,
          finalUrl,
          destinationDate: landingAnalysis.postedText,
          destinationExp: landingAnalysis.expText
        });
      }

    } catch (err) {
      console.log(`  -> [ERROR] Failed auditing destination: ${err.message}`);
      droppedStaleDestinations.push({ ...job, dropReason: `Navigation error: ${err.message}` });
    }

    // Persist live
    fs.writeFileSync('scripts/adzuna_destination_verified.json', JSON.stringify(verifiedDestinationClean, null, 2));
    fs.writeFileSync('scripts/adzuna_destination_dropped.json', JSON.stringify(droppedStaleDestinations, null, 2));

    await sleep(1500);
  }

  await page.close();
  await browser.disconnect();

  console.log(`\n================ ADZUNA AUDIT FINISHED ================`);
  console.log(`Total Audited: ${adzunaJobs.length}`);
  console.log(`Genuine Fresh & Active: ${verifiedDestinationClean.length}`);
  console.log(`Dropped (Stale Year / Closed / Dead): ${droppedStaleDestinations.length}`);
  console.log(`=======================================================`);
}

main().catch(console.error);
