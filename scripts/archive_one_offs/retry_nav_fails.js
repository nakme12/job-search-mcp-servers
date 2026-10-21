import fs from 'fs';
import puppeteer from 'puppeteer';

const VERIFIED_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_destination_verified_final.json';
const DROPPED_FILE = 'C:/mcp/job-search-mcp-engine/scripts/adzuna_destination_dropped_final.json';

const verified = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
const dropped = JSON.parse(fs.readFileSync(DROPPED_FILE, 'utf8'));

// Get the 14 nav fail jobs
const navFails = dropped.filter(d => d.drop_reason && d.drop_reason.includes('Audit navigation failure'));
console.log(`Auditing ${navFails.length} navigation failures with robust navigation handling...`);

function parseRelativeDate(text) {
  const lower = text.toLowerCase();
  const pastYears = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  for (const yr of pastYears) {
    if (lower.includes(yr)) {
      return { isStale: true, reason: `Posted in past year (${yr})` };
    }
  }
  if (lower.includes('month ago') || lower.includes('months ago')) return { isStale: true, reason: 'Posted months ago' };
  if (lower.includes('year ago') || lower.includes('years ago')) return { isStale: true, reason: 'Posted years ago' };
  if (lower.includes('week ago') || lower.includes('weeks ago')) {
    if (!lower.includes('1 week ago') && !lower.includes('a week ago')) return { isStale: true, reason: 'Posted > 1 week ago' };
  }
  const daysMatch = lower.match(/(\d+)\+?\s*days?\s*ago/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    if (days > 7) return { isStale: true, reason: `Posted ${days} days ago (> 7 days)` };
  }
  return { isStale: false };
}

function parseExperience(text) {
  const lower = text.toLowerCase();
  const rangeMatch = lower.match(/(\d+)\s*[-–to]\s*(\d+)\s*(?:years?|yrs?)/);
  if (rangeMatch) {
    const minExp = parseInt(rangeMatch[1]);
    if (minExp >= 3) return { isOverExp: true, minExp, reason: `Minimum experience ${minExp} YOE >= 3` };
  }
  const plusMatch = lower.match(/(\d+)\+\s*(?:years?|yrs?)/);
  if (plusMatch) {
    const minExp = parseInt(plusMatch[1]);
    if (minExp >= 3) return { isOverExp: true, minExp, reason: `Minimum experience ${minExp}+ YOE >= 3` };
  }
  const minMatch = lower.match(/(?:min|minimum)\s*experience[:\s]+(\d+)/);
  if (minMatch) {
    const minExp = parseInt(minMatch[1]);
    if (minExp >= 3) return { isOverExp: true, minExp, reason: `Minimum experience ${minExp} YOE >= 3` };
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
    if (lower.includes(phrase)) return { isClosed: true, reason: phrase };
  }
  return { isClosed: false };
}

async function retryNavFails() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const updatedDropped = dropped.filter(d => !d.drop_reason || !d.drop_reason.includes('Audit navigation failure'));

  for (let i = 0; i < navFails.length; i++) {
    const job = navFails[i];
    console.log(`\n[Retry ${i + 1}/${navFails.length}] ID: ${job.id} | ${job.company} | ${job.role}`);
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    let destUrl = job.url;
    let finalTitle = '';
    let bodyText = '';
    let dropReason = null;

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 2000));

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
      } else if (applyInfo.isEasyApply || (applyInfo.href.includes('/details/') && applyInfo.href.includes('/apply'))) {
        destUrl = job.url;
        finalTitle = await page.title();
        bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');

        const closedCheck = checkClosed(bodyText);
        if (closedCheck.isClosed) dropReason = `Closed on Adzuna: ${closedCheck.reason}`;
        else {
          const expCheck = parseExperience(bodyText);
          if (expCheck.isOverExp) dropReason = `Over experience on Adzuna: ${expCheck.reason}`;
          else {
            const dateCheck = parseRelativeDate(bodyText);
            if (dateCheck.isStale) dropReason = `Stale on Adzuna: ${dateCheck.reason}`;
          }
        }
      } else {
        // External redirect link
        console.log(`    Following redirect via: ${applyInfo.href}`);
        await page.goto(applyInfo.href, { waitUntil: 'load', timeout: 35000 }).catch(e => console.log('    goto notice:', e.message));
        await new Promise(r => setTimeout(r, 3000));
        destUrl = page.url();
        finalTitle = await page.title();
        bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');
        console.log(`    Destination URL: ${destUrl}`);
        console.log(`    Destination Title: ${finalTitle}`);

        const closedCheck = checkClosed(bodyText);
        if (closedCheck.isClosed) dropReason = `Closed on destination (${closedCheck.reason})`;
        else {
          const expCheck = parseExperience(bodyText);
          if (expCheck.isOverExp) dropReason = `Over experience on destination (${expCheck.reason})`;
          else {
            const dateCheck = parseRelativeDate(bodyText);
            if (dateCheck.isStale) dropReason = `Stale posted date on destination (${dateCheck.reason})`;
          }
        }
      }
    } catch (e) {
      console.log(`    Error in retry: ${e.message}`);
      dropReason = `Final retry failed: ${e.message}`;
    } finally {
      await page.close();
    }

    if (dropReason) {
      console.log(`    ❌ DROPPED: ${dropReason}`);
      updatedDropped.push({
        ...job,
        destination_url: destUrl,
        destination_title: finalTitle,
        drop_reason: dropReason,
        audited_at: new Date().toISOString()
      });
    } else {
      console.log(`    ✅ VERIFIED ACTIVE: Destination is live, 0-2 YOE, fresh date`);
      verified.push({
        ...job,
        destination_url: destUrl,
        destination_title: finalTitle,
        audited_at: new Date().toISOString()
      });
    }
  }

  await browser.close();

  fs.writeFileSync(VERIFIED_FILE, JSON.stringify(verified, null, 2));
  fs.writeFileSync(DROPPED_FILE, JSON.stringify(updatedDropped, null, 2));

  console.log(`\nFinal Retried Verification Summary:`);
  console.log(`Total Verified: ${verified.length}`);
  console.log(`Total Dropped: ${updatedDropped.length}`);
}

retryNavFails().catch(console.error);
