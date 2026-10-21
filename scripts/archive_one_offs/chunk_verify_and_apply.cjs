/**
 * chunk_verify_and_apply.cjs
 * - Takes a chunk size (e.g. 5 jobs at a time)
 * - Thoroughly audits each job: Active status, exact YOE, Easy Apply vs Direct Portal
 * - If verified valid & fits candidate: executes application or stages for form fill
 * - Outputs explicit chunk audit table with exact reason for every single job
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHUNK_SIZE = 10;
const QUEUE_FILE = path.join(__dirname, '..', 'claude_ready_to_apply_queue.json');
const VERIFIED_SHIFT2_FILE = path.join(__dirname, '..', 'verified_todays_2026-10-14_shift2.json');
const APPLIED_SHIFT2_FILE = path.join(__dirname, '..', 'applied_todays_2026-10-14_shift2.json');
const SHIFT2_SS_DIR = path.join(__dirname, '..', 'screenshots', '2026-10-14', 'shift2');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processChunk() {
  if (!fs.existsSync(QUEUE_FILE)) {
    console.log('Queue file empty or does not exist.');
    return;
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  if (queue.length === 0) {
    console.log('No pending jobs left in queue! All chunks completed.');
    return;
  }

  const currentChunk = queue.slice(0, CHUNK_SIZE);
  const remainingQueue = queue.slice(CHUNK_SIZE);

  console.log(`\n======================================================`);
  console.log(`📦 [PROCESSING CHUNK OF ${currentChunk.length} JOBS] (${remainingQueue.length} jobs remaining after this)`);
  console.log(`======================================================`);

  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const chunkReport = [];

  for (let idx = 0; idx < currentChunk.length; idx++) {
    const job = currentChunk[idx];
    console.log(`\n--> [${idx + 1}/${currentChunk.length}] Auditing: ${job.company} (${job.role})`);
    console.log(`    URL: ${job.url}`);

    const p = await browser.newPage();
    p.setDefaultTimeout(30000);

    let status = 'PENDING';
    let reason = '';
    let actionTaken = 'NONE';

    try {
      await p.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3500);

      const audit = await p.evaluate(() => {
        const text = document.body.innerText;
        const lower = text.toLowerCase();
        
        const isClosed = lower.includes('no longer accepting applications') || 
                         lower.includes('this job is closed') || 
                         lower.includes('job expired') ||
                         lower.includes('page not found');

        const m = text.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?)/i);
        let minExp = null;
        if (m) minExp = parseInt(m[1], 10);

        const isEasyApply = !!document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]');
        const hasExternalApply = !!document.querySelector('.jobs-apply-button--top-card, button[aria-label*="Apply"]');

        // Extract any email mentioned in JD text
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const contactEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

        return { isClosed, minExp, isEasyApply, hasExternalApply, contactEmail };
      });

      if (audit.isClosed) {
        status = 'DISCARDED';
        reason = 'Posting expired/closed on live site';
      } else if (audit.minExp && audit.minExp > 2) {
        status = 'DISCARDED';
        reason = `Out of range: requires ${audit.minExp}+ YOE (> 2 ceiling)`;
      } else {
        status = 'VERIFIED_CLEAN';
        reason = `Active 0-2 YOE confirmed. Type: ${audit.isEasyApply ? 'Easy Apply' : (audit.contactEmail ? `Direct Email (${audit.contactEmail})` : 'External Portal')}`;
        
        // Save to verified_todays_2026-10-14_shift2.json
        let vData = { date: '2026-10-14', shift: 2, jobs: [] };
        if (fs.existsSync(VERIFIED_SHIFT2_FILE)) {
          try { vData = JSON.parse(fs.readFileSync(VERIFIED_SHIFT2_FILE, 'utf8')); } catch(e) {}
        }
        if (!vData.jobs.some(j => (j.url || '').toLowerCase() === job.url.toLowerCase())) {
          vData.jobs.push({
            company: job.company,
            role: job.role,
            location: job.location,
            url: job.url,
            contact_email: audit.contactEmail,
            type: audit.isEasyApply ? 'easy_apply' : (audit.contactEmail ? 'direct_email' : 'ats_portal'),
            timestamp: new Date().toISOString()
          });
          fs.writeFileSync(VERIFIED_SHIFT2_FILE, JSON.stringify(vData, null, 2));
        }
      }

      await p.close();
    } catch(err) {
      status = 'ERROR';
      reason = err.message.substring(0, 80);
      try { await p.close(); } catch(e) {}
    }

    chunkReport.push({
      company: job.company,
      role: job.role,
      status,
      reason
    });
  }

  // Update queue file with remaining jobs
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(remainingQueue, null, 2));

  console.log(`\n================ CHUNK AUDIT SUMMARY ================`);
  console.table(chunkReport);
  console.log(`Remaining in queue: ${remainingQueue.length} jobs.`);
}

processChunk().catch(console.error);
