const fs = require('fs');
const puppeteer = require('puppeteer-core');

async function verifyAllPortals() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  
  const verifiedData = JSON.parse(fs.readFileSync('verified_todays_2026-10-19.json', 'utf8'));
  const totalData = JSON.parse(fs.readFileSync('total_todays_2026-10-19.json', 'utf8'));
  
  // Extract all portal jobs from verifiedData and totalData
  const portalCandidates = [];
  const seenUrls = new Set();

  function addCandidate(j, origin) {
    const url = j.url || j.apply_url;
    if (!url || j.recipient || j.email || j.target_email) return;
    const cleanUrl = url.trim();
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    portalCandidates.push({
      company: j.company || 'Unknown',
      role: j.role || j.title || 'Software Engineer',
      url: cleanUrl,
      source: j.source || origin,
      raw_experience: j.experience || j.exp || 'N/A',
      location: j.location || 'India',
      origin
    });
  }

  // 1. Portals in verified_todays
  for (const j of verifiedData.jobs) {
    addCandidate(j, 'verified_todays');
  }

  // 2. High-value / dev portals in total_todays that weren't in verified
  for (const j of totalData.jobs) {
    const r = (j.role || j.title || '').toLowerCase();
    // Exclude obvious non-stack or intern
    if (/intern|internship|trainee|data entry|delivery|hardware|solution architect/i.test(r)) continue;
    if (/react|frontend|front end|full stack|fullstack|mern|web developer|software engineer|sde|javascript|typescript/i.test(r)) {
      addCandidate(j, 'total_todays_pool');
    }
  }

  console.log(`Found ${portalCandidates.length} candidate portal jobs to strictly verify.`);

  const results = {
    live_verified: [],
    discarded: []
  };

  const auditPage = await browser.newPage();
  await auditPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

  for (let i = 0; i < portalCandidates.length; i++) {
    const job = portalCandidates[i];
    console.log(`\n[${i+1}/${portalCandidates.length}] Auditing: ${job.company} — ${job.role} (${job.origin})`);
    console.log(`URL: ${job.url}`);

    try {
      // Direct navigation
      const res = await auditPage.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2500));

      const title = await auditPage.title();
      const currentUrl = auditPage.url();
      const pageText = await auditPage.evaluate(() => document.body ? document.body.innerText : '');

      // Check dead indicators
      const is404 = /404|page not found|doesn't exist|does not exist/i.test(title) || /404 - page not found|page you are looking for doesn't exist|oops, we couldn’t find that page/i.test(pageText);
      const isUnavailable = /position is no longer available|job has expired|this job is no longer available|job is expired|no longer accepting applications/i.test(pageText) || /position is no longer available/i.test(title);
      const isExecutiveReferral = /requisition for executive referrals only|executive referrals only/i.test(pageText) || /executive referrals only/i.test(title);
      const isFreelancer = /become a freelancer|freelance content/i.test(job.role) || /freelance content/i.test(pageText.slice(0, 500));
      const isIntern = /internship|intern\b/i.test(job.role) || /internship|intern\b/i.test(title);

      // YOE check
      let yoeMismatch = false;
      let detectedYoe = '0-2 YOE';
      const yoeMatch = pageText.match(/(\d+)\s*[-+to]*\s*(\d+)?\s*(years|yrs|year)\s*(of\s*)?experience/i);
      if (yoeMatch) {
        const minExp = parseInt(yoeMatch[1]);
        detectedYoe = yoeMatch[0];
        if (minExp >= 3) {
          yoeMismatch = true;
        }
      }

      if (is404) {
        console.log(`❌ DISCARDED: 404 Not Found`);
        results.discarded.push({ ...job, reason: '404_PAGE_NOT_FOUND', currentUrl });
      } else if (isUnavailable) {
        console.log(`❌ DISCARDED: Position No Longer Available / Expired`);
        results.discarded.push({ ...job, reason: 'POSITION_NO_LONGER_AVAILABLE', currentUrl });
      } else if (isExecutiveReferral) {
        console.log(`❌ DISCARDED: Executive Referrals Only`);
        results.discarded.push({ ...job, reason: 'EXECUTIVE_REFERRAL_ONLY', currentUrl });
      } else if (isFreelancer) {
        console.log(`❌ DISCARDED: Freelance / Non-Engineering Role`);
        results.discarded.push({ ...job, reason: 'FREELANCE_OR_CONTENT_ROLE', currentUrl });
      } else if (isIntern) {
        console.log(`❌ DISCARDED: Student Intern / Internship`);
        results.discarded.push({ ...job, reason: 'INTERNSHIP_ROLE', currentUrl });
      } else if (yoeMismatch) {
        console.log(`❌ DISCARDED: Out of Range YOE (${detectedYoe})`);
        results.discarded.push({ ...job, reason: `OUT_OF_RANGE_YOE: ${detectedYoe}`, currentUrl });
      } else {
        console.log(`✅ VERIFIED LIVE: ${title}`);
        results.live_verified.push({
          ...job,
          final_url: currentUrl,
          page_title: title,
          verified_yoe: detectedYoe,
          verified_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.log(`⚠️ ERROR during audit: ${e.message}`);
      results.discarded.push({ ...job, reason: `AUDIT_ERROR: ${e.message}` });
    }
  }

  await auditPage.close();

  fs.writeFileSync('audit_results_all_portals.json', JSON.stringify(results, null, 2));
  console.log('\n=======================================');
  console.log(`TOTAL AUDITED: ${portalCandidates.length}`);
  console.log(`VERIFIED LIVE PORTALS: ${results.live_verified.length}`);
  console.log(`DISCARDED: ${results.discarded.length}`);
  console.log('Results saved to audit_results_all_portals.json');
}

verifyAllPortals().catch(console.error);
