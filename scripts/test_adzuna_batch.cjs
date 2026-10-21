const { resolveAdzunaJob } = require('./adzuna_destination_resolver.cjs');
const fs = require('fs');

async function runBatchTest() {
  const raw = JSON.parse(fs.readFileSync('total_todays_2026-10-16_shift1.json', 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.jobs || raw.data || Object.values(raw));
  const adzunaJobs = list.filter(j => j && ((j.url && j.url.includes('adzuna')) || (j.source && j.source.toLowerCase().includes('adzuna'))));

  // Pick 4 diverse jobs from different companies (indices 2, 3, 4, 5)
  const targets = [
    adzunaJobs[2], // Tradylcom
    adzunaJobs[3], // BirthVenue Growth Solutions
    adzunaJobs[4], // Buyhatke
    adzunaJobs[5]  // Synorus
  ];

  console.log(`======================================================`);
  console.log(`🚀 STARTING RIGOROUS 4-JOB ADZUNA RESOLUTION TEST`);
  console.log(`======================================================\n`);

  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const job = targets[i];
    console.log(`\n------------------------------------------------------`);
    console.log(`[JOB ${i + 1}/${targets.length}] Company: ${job.company}`);
    console.log(`Adzuna Link: ${job.url}`);
    console.log(`------------------------------------------------------`);

    const result = await resolveAdzunaJob(job.url);
    results.push({
      company: job.company,
      adzunaUrl: job.url,
      ...result
    });

    console.log(`[JOB ${i + 1} COMPLETE] Verdict: ${result.finalStatus || result.error}`);
    // Brief spacing between jobs
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n======================================================`);
  console.log(`📊 FINAL SUMMARY OF 4-JOB ADZUNA TEST`);
  console.log(`======================================================`);
  console.table(results.map(r => ({
    Company: r.company,
    LandedUrl: r.destinationUrl ? r.destinationUrl.substring(0, 50) + '...' : 'ERROR',
    Title: r.destinationTitle ? r.destinationTitle.substring(0, 30) + '...' : 'ERROR',
    Status: r.finalStatus || r.error,
    FormFound: r.auditResult ? r.auditResult.hasPhysicalForm : false,
    OverExp: r.auditResult ? r.auditResult.isOverExperience : false
  })));

  fs.writeFileSync('adzuna_4job_test_results.json', JSON.stringify(results, null, 2));
  console.log(`Saved detailed results to adzuna_4job_test_results.json`);
}

runBatchTest().catch(console.error);
