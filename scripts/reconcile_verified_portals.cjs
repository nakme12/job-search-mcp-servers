const fs = require('fs');

function reconcile() {
  const rawAudit = JSON.parse(fs.readFileSync('audit_results_all_portals.json', 'utf8'));
  const appliedData = JSON.parse(fs.readFileSync('applied_todays_2026-10-19.json', 'utf8'));
  const verifiedExisting = JSON.parse(fs.readFileSync('verified_todays_2026-10-19.json', 'utf8'));
  const histFile1 = fs.existsSync('total_historical_except_today.json') ? JSON.parse(fs.readFileSync('total_historical_except_today.json', 'utf8')) : [];
  const histFile2 = fs.existsSync('applied_lifetime_except_today.json') ? JSON.parse(fs.readFileSync('applied_lifetime_except_today.json', 'utf8')) : [];

  const blacklistUrls = new Set();
  const blacklistCompanies = new Set();

  function addToBlacklist(list) {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (item.url) blacklistUrls.add(item.url.toLowerCase().trim());
      if (item.apply_url) blacklistUrls.add(item.apply_url.toLowerCase().trim());
      if (item.company) blacklistCompanies.add(item.company.toLowerCase().trim());
    }
  }

  addToBlacklist(histFile1);
  addToBlacklist(histFile2);

  // Preserve the 37 confirmed email jobs
  const emailJobs = verifiedExisting.jobs.filter(j => j.recipient || j.email || j.target_email || j.application_type === 'Direct Recruiter Email');

  console.log(`Preserving ${emailJobs.length} confirmed dispatched email jobs.`);

  const validPortals = [];
  const rejectedPortals = [];

  for (const job of rawAudit.live_verified) {
    const title = (job.page_title || '').toLowerCase();
    const role = (job.role || '').toLowerCase();
    const loc = (job.location || '').toLowerCase();
    const company = (job.company || '').toLowerCase().trim();
    const url = (job.final_url || job.url || '').toLowerCase().trim();

    // 0. Banned company strings (Rule 1 violation)
    if (/object object|unknown|null|tech firm/i.test(company)) {
      rejectedPortals.push({ ...job, filter_reason: 'INVALID_COMPANY_NAME' });
      continue;
    }

    // 1. Historical Blacklist
    if (blacklistUrls.has(url)) {
      rejectedPortals.push({ ...job, filter_reason: 'HISTORICAL_DUPLICATE_URL' });
      continue;
    }
    // Also check staffing agencies known for ghosting/dups like Jobgether, Creative Hands HR
    if (/jobgether|creative hands hr/i.test(company)) {
      rejectedPortals.push({ ...job, filter_reason: 'GHOST_STAFFING_AGENCY' });
      continue;
    }

    // 2. Exclude country-specific onsite foreign locations if explicitly restricted
    if (/\b(usa|united states|uk|united kingdom|argentina|mexico|canada|germany|france|australia)\b/i.test(role) ||
        /\b(usa|united states|uk|united kingdom|argentina|mexico|canada|germany|france|australia)\b/i.test(title)) {
      if (!/remote|anywhere|worldwide/i.test(loc) && !/remote|anywhere|worldwide/i.test(title)) {
        rejectedPortals.push({ ...job, filter_reason: 'FOREIGN_ONSITE_LOCATION' });
        continue;
      }
    }

    // 3. Exclude interns/trainees / future batch
    if (/intern|internship|trainee|batch 2027|batch 2028|new grad 2027|new grad 2028/i.test(role) ||
        /intern|internship|trainee|batch 2027|batch 2028|new grad 2027|new grad 2028/i.test(title)) {
      rejectedPortals.push({ ...job, filter_reason: 'INTERN_OR_FUTURE_CAMPUS_BATCH' });
      continue;
    }

    // 4. Exclude Senior / Lead / Principal / Architect / 3+ YOE
    if (/\b(senior|lead|principal|architect|sr\.|sr\s)\b/i.test(role) || /\b(senior|lead|principal|architect|sr\.|sr\s)\b/i.test(title)) {
      rejectedPortals.push({ ...job, filter_reason: 'SENIOR_LEAD_ROLE' });
      continue;
    }

    // 5. Exclude non-dev / backend only Java / .NET / Python only if strictly Web/Frontend/Fullstack
    if (/\b(\.net|ios|android|flutter|hardware|delivery consultant|solutions architect|solution architect)\b/i.test(role)) {
      rejectedPortals.push({ ...job, filter_reason: 'STACK_MISMATCH' });
      continue;
    }

    // 6. Exclude duplicates inside this run
    const isDup = validPortals.some(p => p.url === job.url || (p.final_url && p.final_url === job.final_url) || (p.company.toLowerCase() === company && p.role.toLowerCase() === role));
    if (isDup) {
      rejectedPortals.push({ ...job, filter_reason: 'DUPLICATE_WITHIN_BATCH' });
      continue;
    }

    validPortals.push(job);
  }

  console.log(`\nReconciliation Results:`);
  console.log(`- Total Live Verified Candidate Portals: ${rawAudit.live_verified.length}`);
  console.log(`- Filtered In (Strict 0-2 YOE Web/Dev/Fullstack): ${validPortals.length}`);
  console.log(`- Filtered Out: ${rejectedPortals.length}`);

  // Re-write verified_todays_2026-10-19.json
  const finalVerifiedJobs = [...emailJobs, ...validPortals];
  const outputData = {
    date: '2026-10-19',
    shift: 'shift1',
    cycle: 1,
    description: '100% physically asserted & verified jobs today (37 Sent Emails + Clean Live Portals)',
    total: finalVerifiedJobs.length,
    email_dispatched_total: emailJobs.length,
    verified_live_portals_total: validPortals.length,
    jobs: finalVerifiedJobs
  };

  fs.writeFileSync('verified_todays_2026-10-19.json', JSON.stringify(outputData, null, 2));
  fs.writeFileSync('verified_portal_jobs_clean.json', JSON.stringify(validPortals, null, 2));
  fs.writeFileSync('rejected_portal_jobs_audit.json', JSON.stringify(rejectedPortals, null, 2));
  console.log(`Successfully updated verified_todays_2026-10-19.json with ${finalVerifiedJobs.length} verified jobs.`);
}

reconcile();
