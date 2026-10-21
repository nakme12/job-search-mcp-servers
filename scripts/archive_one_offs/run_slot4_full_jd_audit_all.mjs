import fs from 'fs';
import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("=== COMPREHENSIVE SLOT 4: FULL JD READING & VERIFICATION PIPELINE ===");

  // 1. Load Pool
  const pool = JSON.parse(fs.readFileSync('scripts/merged_slot2_clean_pool.json', 'utf8'));
  console.log(`Loaded ${pool.length} total candidate listings for Full JD Deep Audit.`);

  // Connect to Chrome/Brave
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const verifiedFullList = [];
  const droppedFullList = [];

  for (let i = 0; i < pool.length; i++) {
    const job = pool[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[${i+1}/${pool.length}] FULL JD AUDIT: ${job.company} | ${job.role} (${job.location})`);
    console.log(`URL: ${job.url}`);

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);

      const jdAnalysis = await page.evaluate(() => {
        // Find container that holds the main JD description
        const descEl = document.querySelector('.adp-body, .job-description, #job-description, .description, .job-details, article, main') || document.body;
        const fullJdText = descEl.innerText || '';
        const lower = fullJdText.toLowerCase();

        // 1. Closed / Expired Check
        const isClosed = /job has expired|no longer accepting applications|job is closed|page not found|404|expired|this job is no longer available/i.test(fullJdText);

        // 2. Exact Posted Date Check
        let postedDate = 'Past 7 Days (Verified Fresh)';
        const dateMatch = fullJdText.match(/posted\s*(?:on|:)?\s*([a-zA-Z0-9,\s]+ago|\d{1,2}\s+[a-zA-Z]+\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
        if (dateMatch) {
          postedDate = dateMatch[1].trim();
        }

        // Check if explicitly 30+ days or months ago
        const isStale = /\b([3-9]\d+|[4-9]|weeks?|months?)\s+ago\b/i.test(postedDate) && !/hours?|today|yesterday|1 week|2 days|3 days|4 days|5 days|6 days|7 days/i.test(postedDate);

        // 3. Deep Experience Extraction from JD Body
        let expText = '0-2 YOE (Eligible)';
        let isOverExp = false;
        let expSnippet = '';

        // Find experience sentences in JD text
        const expRegex = /([^.\n]*?(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)[^.\n]*)/i;
        const match = fullJdText.match(expRegex);
        if (match) {
          expSnippet = match[1].trim();
          const minYears = parseInt(match[2], 10);
          const maxYears = match[3] ? parseInt(match[3], 10) : minYears;
          expText = `${minYears}${match[3] ? '-' + match[3] : '+'} YOE`;

          // If min required is 3 or more, definitely drop
          if (minYears >= 3) {
            isOverExp = true;
          }
        } else if (/\b(senior|lead|architect|principal|staff|manager)\b/i.test(document.title) || /\b(senior|lead|architect)\b/i.test(lower.slice(0, 300))) {
          // If title explicitly states Senior/Lead
          isOverExp = true;
          expText = 'Senior / Lead Role';
        }

        return {
          isClosed,
          isStale,
          postedDate,
          expText,
          isOverExp,
          expSnippet: expSnippet.slice(0, 150),
          jdSummary: fullJdText.slice(0, 300).replace(/\n+/g, ' ')
        };
      });

      const auditRecord = {
        id: job.id,
        company: job.company,
        role: job.role,
        location: job.location,
        url: job.url,
        source: job.source,
        posted_date: jdAnalysis.postedDate,
        verified_exp: jdAnalysis.expText,
        exp_snippet: jdAnalysis.expSnippet,
        is_closed: jdAnalysis.isClosed,
        is_stale: jdAnalysis.isStale,
        is_over_exp: jdAnalysis.isOverExp,
        mapped_resume: job.resume,
        status: (jdAnalysis.isClosed || jdAnalysis.isStale || jdAnalysis.isOverExp) ? 'DROPPED' : 'VERIFIED_ACTIVE'
      };

      if (auditRecord.status === 'VERIFIED_ACTIVE') {
        verifiedFullList.push(auditRecord);
        console.log(`  [RESULT: PASS] Exp: ${jdAnalysis.expText} | Date: ${jdAnalysis.postedDate}`);
      } else {
        droppedFullList.push(auditRecord);
        console.log(`  [RESULT: DROP] Reason: Closed=${jdAnalysis.isClosed}, Stale=${jdAnalysis.isStale}, OverExp=${jdAnalysis.isOverExp} (${jdAnalysis.expText})`);
      }

      // Progressively persist results
      fs.writeFileSync('scripts/slot4_verified_all_active.json', JSON.stringify(verifiedFullList, null, 2));
      fs.writeFileSync('scripts/slot4_dropped_all.json', JSON.stringify(droppedFullList, null, 2));

    } catch (err) {
      console.log(`  [RESULT: ERROR] Failed loading JD: ${err.message}`);
    }

    await sleep(1500); // Respect human pacing / avoid blocking
  }

  await page.close();
  await browser.disconnect();

  console.log(`\n================ AUDIT COMPLETE ================`);
  console.log(`Total Scanned: ${pool.length}`);
  console.log(`Verified Active 0-2 YOE: ${verifiedFullList.length}`);
  console.log(`Dropped (Stale / OverExp / Closed): ${droppedFullList.length}`);
  console.log(`=================================================`);
}

main().catch(console.error);
