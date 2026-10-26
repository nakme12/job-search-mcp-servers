import fs from 'fs';
import path from 'path';

const TODAY = '2026-10-26';
const FILE3_PATH = `C:/mcp/job-search-mcp-engine/total_todays_${TODAY}.json`;
const HIST_PATH = 'C:/mcp/job-search-mcp-engine/total_historical_except_today.json';

async function ingestDeveloperHub() {
  console.log('📡 Fetching Developer Hub Jobs API...');
  
  // 1. Load Historical Deduplication Set
  const historicalSet = new Set();
  if (fs.existsSync(HIST_PATH)) {
    try {
      const hData = JSON.parse(fs.readFileSync(HIST_PATH, 'utf8'));
      (Array.isArray(hData) ? hData : (hData.jobs || [])).forEach(j => {
        const u = (j.recipient_or_url || j.url || j.recipient || '').trim().toLowerCase();
        if (u) historicalSet.add(u);
      });
    } catch (e) {}
  }

  // 2. Load File 3
  let file3 = { date: TODAY, total: 0, jobs: [] };
  if (fs.existsSync(FILE3_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(FILE3_PATH, 'utf8'));
      if (Array.isArray(parsed)) {
        file3.jobs = parsed;
        file3.total = parsed.length;
      } else if (parsed && Array.isArray(parsed.jobs)) {
        file3 = parsed;
      }
    } catch (e) {}
  }
  const seenToday = new Set(file3.jobs.map(j => (j.url || j.recipient || '').trim().toLowerCase()).filter(Boolean));

  let addedCount = 0;
  let page = 1;
  const maxPages = 3;

  while (page <= maxPages) {
    const url = `https://developer-hub-server-fypd.onrender.com/api/v1/website/jobs?sort=newest&page=${page}&limit=50`;
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const json = await res.json();
      const items = json.data?.items || [];
      if (!items.length) break;

      for (const item of items) {
        const title = item.role || item.title || '';
        const company = (item.company || '').trim();
        const location = item.location || 'India / Remote';
        const expStr = (item.experience || '').trim();
        const email = (item.email || '').trim().toLowerCase();
        const applyUrl = (item.apply_url || item.url || '').trim();
        const skills = Array.isArray(item.skills) ? item.skills.join(', ') : (item.skills || '');
        const fullText = `${title} ${company} ${skills} ${location} ${expStr}`.toLowerCase();

        // Stack Check
        const isStack = /react|frontend|front-end|mern|next\.?js|web developer|full stack|fullstack/i.test(fullText);
        const isBanned = /react native|flutter|android|ios|devops|data engineer/i.test(fullText);
        if (!isStack || isBanned) continue;

        // Experience Check: Allow ranges 0-2, 0-3, 0-4, 1-3, 1-4, 2-4, 2-5, or Fresher
        // Drop ONLY strict >= 3 minimums (e.g. 3-5, 4+, 5+, 6+)
        if (/\b(?:[3-9]|1[0-9])\s*[-+to]\s*[0-9]*\s*(?:years?|yrs?)/i.test(expStr) && !/\b[0-2]\s*[-to]/i.test(expStr)) {
          continue;
        }

        const primaryTarget = email || applyUrl;
        if (!primaryTarget) continue;

        const normTarget = primaryTarget.toLowerCase();
        if (historicalSet.has(normTarget) || seenToday.has(normTarget)) continue;

        let mappedResume = 'Pratik Patidar Resume - Frontend Engineer.pdf';
        if (fullText.includes('react') || fullText.includes('ui') || fullText.includes('next')) {
          mappedResume = 'Pratik Patidar Resume - React Developer.pdf';
        } else if (fullText.includes('mern') || fullText.includes('full stack') || fullText.includes('node')) {
          mappedResume = 'Pratik Patidar Resume - MERN Full Stack.pdf';
        }

        const newJob = {
          id: `devhub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title,
          company,
          location,
          url: applyUrl || '',
          recipient: email || '',
          application_type: email ? 'Direct Recruiter Email' : 'Direct ATS Form',
          source: 'Developer Hub (@merntech Web)',
          experience: expStr || '0-2 YOE',
          resume_mapped: mappedResume,
          date_posted: item.createdAt || new Date().toISOString(),
          status: email ? 'READY_FOR_DIRECT_EMAIL' : 'DISCOVERED_PENDING_AUDIT',
          raw_text: `${title} at ${company} (${location}) - ${expStr}. Skills: ${skills}`
        };

        file3.jobs.push(newJob);
        seenToday.add(normTarget);
        addedCount++;
        console.log(`✨ [Added from Developer Hub]: ${company} - ${title} (${expStr}) [${newJob.application_type}]`);
      }

      page++;
    } catch (e) {
      console.warn('Developer Hub page fetch error:', e.message);
      break;
    }
  }

  file3.total = file3.jobs.length;
  file3.updated_at = new Date().toISOString();
  fs.writeFileSync(FILE3_PATH, JSON.stringify(file3, null, 2), 'utf8');

  console.log(`\n✅ Ingestion complete! Added ${addedCount} new jobs from Developer Hub.`);
  console.log(`Updated File 3 Total Pool: ${file3.total} leads.`);
}

ingestDeveloperHub().catch(err => {
  console.error('Fatal ingest error:', err);
  process.exit(1);
});
