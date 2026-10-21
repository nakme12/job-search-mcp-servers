import fs from 'fs';
import puppeteer from 'puppeteer';

const CANDIDATES_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_candidates_temp.json';
const VERIFIED_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_destination_verified_final.json';
const DROPPED_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_destination_dropped_final.json';
const PROGRESS_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_audit_progress.json';

const allJobs = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8'));

// Initialize or resume state
let state = {
  currentIndex: 0,
  verified: [],
  dropped: []
};

if (fs.existsSync(PROGRESS_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Resuming from index ${state.currentIndex}. Already verified: ${state.verified.length}, dropped: ${state.dropped.length}`);
  } catch (e) {
    console.log('Starting fresh audit');
  }
}

function parseRelativeDate(text) {
  // Looks for "Posted X days/weeks/months/years ago", "Posted 27 Dec 2021", etc.
  const lower = text.toLowerCase();
  
  // Year check (2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025)
  // Current year is 2026!
  const pastYears = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  for (const yr of pastYears) {
    if (lower.includes(yr)) {
      return { isStale: true, reason: `Posted in past year (${yr})` };
    }
  }

  // Check month / weeks
  if (lower.includes('month ago') || lower.includes('months ago')) {
    return { isStale: true, reason: 'Posted months ago' };
  }
  if (lower.includes('year ago') || lower.includes('years ago')) {
    return { isStale: true, reason: 'Posted years ago' };
  }
  if (lower.includes('week ago') || lower.includes('weeks ago')) {
    // 2 weeks ago or more is definitely > 7 days
    if (!lower.includes('1 week ago') && !lower.includes('a week ago')) {
      return { isStale: true, reason: 'Posted > 1 week ago' };
    }
  }
  const daysMatch = lower.match(/(\d+)\+?\s*days?\s*ago/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    if (days > 7) {
      return { isStale: true, reason: `Posted ${days} days ago (> 7 days)` };
    }
  }

  return { isStale: false };
}

function parseExperience(text) {
  const lower = text.toLowerCase();
  
  // Cutshort specific pattern: "3 - 6 years", "4 - 8 years", "5 - 10 years", etc.
  const rangeMatch = lower.match(/(\d+)\s*[-–to]\s*(\d+)\s*(?:years?|yrs?)/);
  if (rangeMatch) {
    const minExp = parseInt(rangeMatch[1]);
    if (minExp >= 3) {
      return { isOverExp: true, minExp, reason: `Minimum experience ${minExp} YOE >= 3` };
    }
  }

  // "3+ years", "4+ yrs", "5+ years"
  const plusMatch = lower.match(/(\d+)\+\s*(?:years?|yrs?)/);
  if (plusMatch) {
    const minExp = parseInt(plusMatch[1]);
    if (minExp >= 3) {
      return { isOverExp: true, minExp, reason: `Minimum experience ${minExp}+ YOE >= 3` };
    }
  }

  // "Min Experience: 3+ years"
  const minMatch = lower.match(/(?:min|minimum)\s*experience[:\s]+(\d+)/);
  if (minMatch) {
    const minExp = parseInt(minMatch[1]);
    if (minExp >= 3) {
      return { isOverExp: true, minExp, reason: `Minimum experience ${minExp} YOE >= 3` };
    }
  }

  return { isOverExp: false };
}

function checkClosed(text) {
  const lower = text.toLowerCase();
  const closedPhrases = [
    'this job is no longer available',
    'this job has expired',
    'this job is closed',
    'no longer accepting applications',
    'job posting has expired',
    'page not found',
    '404 not found',
    'position has been filled'
  ];
  for (const phrase of closedPhrases) {
    if (lower.includes(phrase)) {
      return { isClosed: true, reason: phrase };
    }
  }
  return { isClosed: false };
}

async function auditChunk(browser, startIndex, chunkSize) {
  const endIndex = Math.min(startIndex + chunkSize, allJobs.length);
  const chunkJobs = allJobs.slice(startIndex, endIndex);
  console.log(`\n======================================================`);
  console.log(`AUDITING BATCH [${startIndex + 1} - ${endIndex}] of ${allJobs.length}`);
  console.log(`======================================================`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  for (let i = 0; i < chunkJobs.length; i++) {
    const job = chunkJobs[i];
    const jobIdx = startIndex + i;
    console.log(`\n--> [${jobIdx + 1}/${allJobs.length}] Checking Job ID: ${job.id} | ${job.company} | ${job.role}`);
    
    let destUrl = '';
    let finalTitle = '';
    let bodyText = '';
    let dropReason = null;

    try {
      // Step 1: Navigate to Adzuna page
      console.log(`    Navigating to Adzuna: ${job.url}`);
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // Step 2: Extract apply link
      const applyInfo = await page.evaluate(() => {
        const a = document.querySelector('a[data-js="apply"]');
        if (a) return { href: a.href, isEasyApply: a.getAttribute('data-ga4-track')?.includes('easy_apply') };
        const links = Array.from(document.querySelectorAll('a'));
        const l = links.find(el => el.innerText.includes('Apply for this job') || el.href.includes('/apply') || el.href.includes('/land/ad/'));
        if (l) return { href: l.href, isEasyApply: false };
        return null;
      });

      if (!applyInfo || !applyInfo.href) {
        dropReason = 'No apply link found on Adzuna page';
      } else if (applyInfo.isEasyApply || applyInfo.href.includes('/details/') && applyInfo.href.includes('/apply')) {
        // If it's an Easy Apply internal registration wrapper, check the Adzuna page body itself for YOE & closed
        const adzunaBody = await page.evaluate(() => document.body ? document.body.innerText : '');
        destUrl = job.url;
        finalTitle = await page.title();
        bodyText = adzunaBody;

        // Check closed
        const closedCheck = checkClosed(bodyText);
        if (closedCheck.isClosed) {
          dropReason = `Closed on Adzuna: ${closedCheck.reason}`;
        } else {
          // Check Experience on Adzuna page
          const expCheck = parseExperience(bodyText);
          if (expCheck.isOverExp) {
            dropReason = `Over experience on Adzuna: ${expCheck.reason}`;
          } else {
            // Check posted date on Adzuna page
            const dateCheck = parseRelativeDate(bodyText);
            if (dateCheck.isStale) {
              dropReason = `Stale on Adzuna: ${dateCheck.reason}`;
            }
          }
        }
      } else {
        // External redirect (e.g. Cutshort, Naukri, Company site)
        console.log(`    Following redirect via: ${applyInfo.href}`);
        await page.goto(applyInfo.href, { waitUntil: 'networkidle2', timeout: 35000 });
        await new Promise(r => setTimeout(r, 2000));
        destUrl = page.url();
        finalTitle = await page.title();
        bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');

        console.log(`    Destination URL: ${destUrl}`);
        console.log(`    Destination Title: ${finalTitle}`);

        // Check if destination is 404 or closed
        const closedCheck = checkClosed(bodyText);
        if (closedCheck.isClosed) {
          dropReason = `Closed on destination (${closedCheck.reason})`;
        } else {
          // Check experience
          const expCheck = parseExperience(bodyText);
          if (expCheck.isOverExp) {
            dropReason = `Over experience on destination (${expCheck.reason})`;
          } else {
            // Check original posted date
            const dateCheck = parseRelativeDate(bodyText);
            if (dateCheck.isStale) {
              dropReason = `Stale posted date on destination (${dateCheck.reason})`;
            }
          }
        }
      }
    } catch (err) {
      console.log(`    Error during deep audit: ${err.message}`);
      dropReason = `Audit navigation failure: ${err.message}`;
    }

    if (dropReason) {
      console.log(`    ❌ DROPPED: ${dropReason}`);
      state.dropped.push({
        ...job,
        destination_url: destUrl || job.url,
        destination_title: finalTitle,
        drop_reason: dropReason,
        audited_at: new Date().toISOString()
      });
    } else {
      console.log(`    ✅ VERIFIED ACTIVE: Destination is live, 0-2 YOE, fresh date`);
      state.verified.push({
        ...job,
        destination_url: destUrl || job.url,
        destination_title: finalTitle,
        audited_at: new Date().toISOString()
      });
    }
  }

  await page.close();
  state.currentIndex = endIndex;

  // Persist files after each chunk
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2));
  fs.writeFileSync(VERIFIED_FILE, JSON.stringify(state.verified, null, 2));
  fs.writeFileSync(DROPPED_FILE, JSON.stringify(state.dropped, null, 2));

  console.log(`\n>>> CHUNK FINISHED: Verified so far: ${state.verified.length} | Dropped so far: ${state.dropped.length} <<<`);
}

async function runAuditor() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const CHUNK_SIZE = 5;
  while (state.currentIndex < allJobs.length) {
    await auditChunk(browser, state.currentIndex, CHUNK_SIZE);
  }

  await browser.close();
  console.log('\n================ ALL 69 AUDITS COMPLETE ================');
  console.log(`Final Verified: ${state.verified.length}`);
  console.log(`Final Dropped: ${state.dropped.length}`);
}

runAuditor().catch(console.error);
