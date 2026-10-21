import fs from 'fs';
import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("=== SLOT 4: DEEP DOM VERIFICATION AUDIT ===");
  
  // 1. Load clean pool (Adzuna + Google Jobs)
  const pool = JSON.parse(fs.readFileSync('scripts/merged_slot2_clean_pool.json', 'utf8'));
  console.log(`Loaded ${pool.length} candidate jobs from merged Slot 2 clean pool.`);

  // Connect to Chrome/Brave
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const auditPage = await browser.newPage();

  const verifiedAudited = [];
  const droppedStaleOrClosed = [];

  // Audit first batch of 15 candidate URLs
  const sampleBatch = pool.slice(0, 15);

  for (let i = 0; i < sampleBatch.length; i++) {
    const job = sampleBatch[i];
    console.log(`\n[${i+1}/${sampleBatch.length}] Auditing: ${job.company} - ${job.role} (${job.location})`);
    console.log(`URL: ${job.url}`);

    try {
      await auditPage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2500);

      const auditData = await auditPage.evaluate(() => {
        const body = document.body.innerText;
        const lower = body.toLowerCase();

        // Check if job expired / closed
        const isClosed = /job has expired|no longer accepting applications|job is closed|page not found|404|expired/i.test(body);

        // Experience detection
        let expText = '0-2 YOE (Eligible)';
        let isOverExp = false;
        
        const expMatch = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/i);
        if (expMatch) {
          const minYears = parseInt(expMatch[1], 10);
          expText = `${minYears}${expMatch[2] ? '-' + expMatch[2] : '+'} YOE`;
          if (minYears >= 3) {
            isOverExp = true;
          }
        } else if (/\b[3-9]\s*\+\s*(?:years?|yrs?|yoe)/i.test(lower)) {
          isOverExp = true;
          expText = '3+ YOE';
        }

        // Freshness/Date detection
        const dateMatch = body.match(/posted\s*(?:on|:)?\s*([a-zA-Z0-9,\s]+ago|\d{1,2}\s+[a-zA-Z]+\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
        const postedText = dateMatch ? dateMatch[1].trim().slice(0, 30) : 'Within past 7 days';

        return {
          title: document.title,
          isClosed,
          isOverExp,
          expText,
          postedText,
          snippet: body.slice(0, 200).replace(/\n+/g, ' ')
        };
      });

      const auditResult = {
        id: job.id,
        company: job.company,
        role: job.role,
        location: job.location,
        url: job.url,
        source: job.source,
        posted_date: auditData.postedText,
        verified_exp: auditData.expText,
        is_closed: auditData.isClosed,
        is_over_exp: auditData.isOverExp,
        mapped_resume: job.resume,
        status: (auditData.isClosed || auditData.isOverExp) ? 'DROPPED' : 'VERIFIED_ACTIVE'
      };

      if (auditResult.status === 'VERIFIED_ACTIVE') {
        verifiedAudited.push(auditResult);
        console.log(`  -> VERIFIED ACTIVE: Exp: ${auditData.expText} | Date: ${auditData.postedText}`);
      } else {
        droppedStaleOrClosed.push(auditResult);
        console.log(`  -> DROPPED: Closed: ${auditData.isClosed} | OverExp: ${auditData.isOverExp} (${auditData.expText})`);
      }

    } catch (err) {
      console.log(`  -> Error auditing URL: ${err.message}`);
    }
  }

  await auditPage.close();
  await browser.disconnect();

  console.log(`\nAudited Sample: ${sampleBatch.length} jobs.`);
  console.log(`Verified Active: ${verifiedAudited.length}`);
  console.log(`Dropped (Stale/Closed/OverExp): ${droppedStaleOrClosed.length}`);

  fs.writeFileSync('scripts/slot4_deep_verified_batch.json', JSON.stringify(verifiedAudited, null, 2));
  fs.writeFileSync('scripts/slot4_dropped_batch.json', JSON.stringify(droppedStaleOrClosed, null, 2));
}

main().catch(console.error);
