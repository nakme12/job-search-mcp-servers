import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { getFilePaths, normalizeTargetId } from './workflow_5file_manager.mjs';

const paths = getFilePaths();
const rawFile = paths.shiftTotal;
const verifiedFile = paths.shiftVerified;

let rawPool = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
let verifiedPool = JSON.parse(fs.readFileSync(verifiedFile, 'utf8'));

const verifiedUrls = new Set(verifiedPool.jobs.map(j => normalizeTargetId(j.url || '')));

const candidateQueue = rawPool.jobs.filter(j => {
  const norm = normalizeTargetId(j.url || '');
  return !verifiedUrls.has(norm);
});

console.log("=======================================================");
console.log(`🔍 SLOT 4: AUDITING ${candidateQueue.length} UNVERIFIED LEADS`);
console.log("=======================================================");

// Keywords to auto-disqualify
const BANNED_TITLE_REGEX = /\b(senior|lead|principal|architect|manager|staff|director|head|vp)\b/i;
const BANNED_TECH_REGEX = /\b(android|ios|flutter|react native|swift|kotlin|c\+\+|golang|devops|data scientist|python)\b/i;

async function runAudit() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const auditPage = await browser.newPage();

  let newlyVerified = 0;
  let skippedCount = 0;

  for (let i = 0; i < candidateQueue.length; i++) {
    const job = candidateQueue[i];
    const prefix = `[Slot 4 Audit ${i+1}/${candidateQueue.length}]`;

    // 1. Title pre-check
    if (BANNED_TITLE_REGEX.test(job.role)) {
      console.log(`${prefix} ${job.company} | ${job.role} -> SKIPPED_OUT_OF_RANGE_YOE (Title)`);
      skippedCount++;
      continue;
    }
    if (BANNED_TECH_REGEX.test(job.role)) {
      console.log(`${prefix} ${job.company} | ${job.role} -> SKIPPED_BANNED_STACK (Title)`);
      skippedCount++;
      continue;
    }

    if (!job.url || !job.url.startsWith('http')) {
      console.log(`${prefix} ${job.company} | No valid URL -> SKIPPED`);
      skippedCount++;
      continue;
    }

    // LinkedIn jobs audit
    if (job.url.includes('linkedin.com/jobs/view/')) {
      try {
        await auditPage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2500));

        const jdInfo = await auditPage.evaluate(() => {
          const body = document.body.innerText;
          const lower = body.toLowerCase();
          const isClosed = /no longer accepting applications|job is closed/i.test(body);
          
          let overExp = false;
          let expSnippet = '0-2 YOE (Fit)';
          const match = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/i);
          if (match) {
            const min = parseInt(match[1], 10);
            if (min >= 3) {
              overExp = true;
              expSnippet = `${min}+ YOE`;
            }
          }
          return { isClosed, overExp, expSnippet };
        });

        if (jdInfo.isClosed || jdInfo.overExp) {
          console.log(`${prefix} ${job.company} | ${job.role} -> REJECTED: Closed=${jdInfo.isClosed}, Exp=${jdInfo.expSnippet}`);
          skippedCount++;
          continue;
        }

        const norm = normalizeTargetId(job.url);
        verifiedUrls.add(norm);
        const approvedJob = {
          ...job,
          id: verifiedPool.jobs.length + 1,
          status: 'VERIFIED_AUDITED',
          mapped_resume: 'Pratik Patidar Resume - Frontend Engineer.pdf',
          verified_at: new Date().toISOString()
        };
        verifiedPool.jobs.push(approvedJob);
        newlyVerified++;
        console.log(`${prefix} ${job.company} | ${job.role} -> ✅ VERIFIED (LinkedIn)`);
        continue;
      } catch (err) {
        console.log(`${prefix} ${job.company} | Audit Error: ${err.message}`);
        skippedCount++;
        continue;
      }
    }

    // Direct ATS forms audit (Ashby, Greenhouse, SmartRecruiters)
    if (job.url.includes('ashbyhq.com') || job.url.includes('greenhouse.io') || job.url.includes('smartrecruiters.com')) {
      try {
        await auditPage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));

        const jdInfo = await auditPage.evaluate(() => {
          const body = document.body.innerText;
          const lower = body.toLowerCase();
          const isClosed = /no longer available|job not found|404|position filled/i.test(body);

          let overExp = false;
          let expSnippet = '0-2 YOE';
          const match = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/i);
          if (match) {
            const min = parseInt(match[1], 10);
            if (min >= 3) {
              overExp = true;
              expSnippet = `${min}+ YOE`;
            }
          } else if (/\b[3-9]\s*\+\s*years?/i.test(lower)) {
            overExp = true;
            expSnippet = '3+ YOE';
          }

          return { isClosed, overExp, expSnippet };
        });

        if (jdInfo.isClosed || jdInfo.overExp) {
          console.log(`${prefix} ${job.company} | ${job.role} -> REJECTED: Closed=${jdInfo.isClosed}, Exp=${jdInfo.expSnippet}`);
          skippedCount++;
          continue;
        }

        let mappedResume = 'Pratik Patidar Resume - Frontend Engineer.pdf';
        if (/react/i.test(job.role)) mappedResume = 'Pratik Patidar Resume - React Developer.pdf';
        if (/mern|full\s*stack/i.test(job.role)) mappedResume = 'Pratik Patidar Resume - MERN Full Stack.pdf';

        const norm = normalizeTargetId(job.url);
        verifiedUrls.add(norm);
        const approvedJob = {
          ...job,
          id: verifiedPool.jobs.length + 1,
          status: 'VERIFIED_AUDITED',
          mapped_resume: mappedResume,
          verified_at: new Date().toISOString()
        };
        verifiedPool.jobs.push(approvedJob);
        newlyVerified++;
        console.log(`${prefix} ${job.company} | ${job.role} -> ✅ VERIFIED ATS PORTAL`);
      } catch (err) {
        console.log(`${prefix} ${job.company} | Audit Error: ${err.message}`);
        skippedCount++;
      }
    }
  }

  await auditPage.close();
  browser.disconnect();

  verifiedPool.total = verifiedPool.jobs.length;
  fs.writeFileSync(verifiedFile, JSON.stringify(verifiedPool, null, 2), 'utf8');
  fs.writeFileSync(paths.todayVerified, JSON.stringify(verifiedPool, null, 2), 'utf8');

  console.log("=======================================================");
  console.log(`✅ Slot 4 Audit Finished: Added ${newlyVerified} newly verified jobs!`);
  console.log(`❌ Filtered/Skipped (Stale / 3+ YOE / Closed): ${skippedCount}`);
  console.log(`🎯 Total Frozen in verified_todays_${paths.today}_shift1.json: ${verifiedPool.total}`);
  console.log("=======================================================");
}

runAudit().catch(console.error);
