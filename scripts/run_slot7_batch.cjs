const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { processSingleJob, getCanonicalProfile } = require('./universal_form_submission_engine.cjs');
const { CANONICAL_PATHS } = require('./canonical_paths.cjs');

async function runBatchSubmission(maxJobs = 5) {
  console.log('========================================================================');
  console.log('🚀 STARTING SLOT 7: HIGH-VELOCITY REA-AUDITED ATS PORTAL SUBMISSIONS');
  console.log('========================================================================');

  const file4Path = CANONICAL_PATHS.getFile4Verified();
  if (!fs.existsSync(file4Path)) {
    console.log('Error: File 4 does not exist at:', file4Path);
    return;
  }

  const f4Data = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
  const candidateJobs = f4Data.jobs.filter(j => j.application_type !== 'READY_FOR_DIRECT_EMAIL');
  console.log(`Found ${candidateJobs.length} eligible direct ATS portal jobs in File 4.`);

  console.log('Connecting to Brave CDP at http://127.0.0.1:9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  
  let successCount = 0;
  let skippedCount = 0;
  const processed = [];

  for (let i = 0; i < Math.min(candidateJobs.length, maxJobs); i++) {
    const job = candidateJobs[i];
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`[Job ${i + 1}/${Math.min(candidateJobs.length, maxJobs)}] Launching worker for: ${job.company} - ${job.role}`);
    console.log(`URL: ${job.url}`);
    console.log(`------------------------------------------------------------------------`);

    const result = await processSingleJob(browser, job, 2);
    processed.push({ job: job.company, result });

    if (result && result.success) {
      successCount++;
    } else {
      skippedCount++;
    }

    // Natural 3s delay between portal tabs (Human pacing)
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n========================================================================');
  console.log(`🎯 SLOT 7 BATCH RUN FINISHED`);
  console.log(`  • Confirmed Submissions: ${successCount}`);
  console.log(`  • Skipped / Unconfirmed: ${skippedCount}`);
  console.log('========================================================================');
}

runBatchSubmission(3).catch(console.error);
