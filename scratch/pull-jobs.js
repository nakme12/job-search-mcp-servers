import fs from 'fs';
import path from 'path';
import { evaluateExperience } from '../experience-filter.js';
import { evaluateFreshness } from '../freshness-filter.js';

// Load .env
const envPath = path.resolve('D:/adi/mcp/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  }
}

const TARGET_TITLES = [
  'frontend developer',
  'frontend engineer',
  'react developer',
  'react.js developer',
  'ui developer',
  'ui engineer',
  'web developer',
  'javascript developer',
  'next.js developer',
  'mern stack developer'
];

const TARGET_LOCATIONS = ['indore', 'jaipur', 'ahmedabad', 'bhopal'];

const MAX_YEARS_EXP = 2;
const EXCLUDE_SENIOR = true;
const MAX_AGE_DAYS = 90;
const EXCLUDE_INTERNSHIPS = true;

// Helper: Check if title is relevant
function isTitleRelevant(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return TARGET_TITLES.some(target => t.includes(target));
}

// Helper: Check if location is relevant
function isLocationRelevant(loc, isRemoteField) {
  if (isRemoteField) return true;
  if (!loc) return false;
  const l = loc.toLowerCase();
  if (l.includes('remote') || l.includes('work from home') || l.includes('wfh')) return true;
  return TARGET_LOCATIONS.some(target => l.includes(target));
}

// Global array for gathered jobs
const allGatheredJobs = [];

// Deduplicate helper
function addJobs(jobs, sourceName) {
  let count = 0;
  for (const job of jobs) {
    // Standardize title/description for evaluation
    const evalExp = evaluateExperience(
      {
        title: job.title,
        description: job.description,
        structuredMinYears: job.structuredMinYears,
        structuredSeniorityLabel: job.structuredSeniorityLabel
      },
      MAX_YEARS_EXP,
      EXCLUDE_SENIOR
    );

    const evalFresh = evaluateFreshness(
      {
        title: job.title,
        employmentType: job.employmentType,
        postedDate: job.postedDate,
        repostedDate: job.repostedDate
      },
      MAX_AGE_DAYS,
      EXCLUDE_INTERNSHIPS
    );

    if (evalExp.exclude || evalFresh.exclude) continue;
    if (!isTitleRelevant(job.title)) continue;
    if (!isLocationRelevant(job.location, job.isRemote)) continue;

    allGatheredJobs.push({
      title: job.title,
      company: job.company,
      location: job.location || (job.isRemote ? 'Remote' : 'Unknown'),
      url: job.url,
      posted: job.postedDate || 'Unknown',
      source: sourceName,
      description: job.description ? job.description.slice(0, 300) + '...' : '',
      detected_min_years_experience: evalExp.detected_min_years_experience,
      looks_senior: evalExp.looks_senior,
      age_days: evalFresh.age_days
    });
    count++;
  }
  console.log(`[${sourceName}] Added ${count} jobs.`);
}

// --- API Calls ---

// 1. SerpApi (Google Jobs)
async function fetchSerpApi() {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return;

  const queries = [
    { q: 'frontend developer OR react developer OR web developer', location: 'Indore, Madhya Pradesh, India' },
    { q: 'frontend developer OR react developer OR web developer', location: 'Jaipur, Rajasthan, India' },
    { q: 'frontend developer OR react developer OR web developer', location: 'Ahmedabad, Gujarat, India' },
    { q: 'frontend developer OR react developer OR web developer', location: 'Bhopal, Madhya Pradesh, India' },
    { q: 'remote frontend developer OR react developer OR web developer India', location: 'India' }
  ];

  for (const query of queries) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.set('engine', 'google_jobs');
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('q', query.q);
      url.searchParams.set('location', query.location);
      url.searchParams.set('gl', 'in');

      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.jobs_results) continue;

      const jobs = data.jobs_results.map(j => ({
        title: j.title,
        company: j.company_name,
        location: j.location,
        url: j.apply_options?.[0]?.link || j.share_link || '',
        postedDate: j.detected_extensions?.posted_at,
        description: j.description,
        isRemote: j.detected_extensions?.work_from_home || false
      }));

      addJobs(jobs, `Google Jobs via SerpApi (${query.location})`);
    } catch (err) {
      console.error(`SerpApi error for ${query.location}:`, err.message);
    }
  }
}

// 2. JobsPipe
async function fetchJobsPipe() {
  const apiKey = process.env.JOBSPIPE_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch('https://api.jobspipe.dev/v1/jobs/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        job_title_or: TARGET_TITLES,
        job_location_or: ['Indore', 'Jaipur', 'Ahmedabad', 'Bhopal'],
        limit: 100
      })
    });
    if (res.ok) {
      const data = await res.json();
      const jobs = (data.data || []).map(j => ({
        title: j.job_title,
        company: j.company_name,
        location: j.job_location,
        url: j.url || j.apply_url || '',
        postedDate: j.date_posted,
        repostedDate: j.reposted ? j.date_reposted : null,
        description: j.description,
        structuredSeniorityLabel: j.seniority
      }));
      addJobs(jobs, 'JobsPipe (Locations)');
    }

    // Also fetch remote
    const resRemote = await fetch('https://api.jobspipe.dev/v1/jobs/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        job_title_or: TARGET_TITLES,
        remote: true,
        limit: 100
      })
    });
    if (resRemote.ok) {
      const data = await resRemote.json();
      const jobs = (data.data || []).map(j => ({
        title: j.job_title,
        company: j.company_name,
        location: j.job_location,
        url: j.url || j.apply_url || '',
        postedDate: j.date_posted,
        repostedDate: j.reposted ? j.date_reposted : null,
        description: j.description,
        structuredSeniorityLabel: j.seniority,
        isRemote: true
      }));
      addJobs(jobs, 'JobsPipe (Remote)');
    }
  } catch (err) {
    console.error('JobsPipe error:', err.message);
  }
}

// 3. TheirStack
async function fetchTheirStack() {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch('https://api.theirstack.com/v1/jobs/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        job_title_or: TARGET_TITLES,
        job_location_or: ['Indore', 'Jaipur', 'Ahmedabad', 'Bhopal'],
        limit: 50
      })
    });
    if (res.ok) {
      const data = await res.json();
      const jobs = (data.data || []).map(j => ({
        title: j.job_title,
        company: j.company_name,
        location: j.job_location,
        url: j.url || '',
        postedDate: j.date_posted || j.posted_at,
        description: j.description,
        structuredSeniorityLabel: j.seniority
      }));
      addJobs(jobs, 'TheirStack (Locations)');
    }

    // Remote
    const resRemote = await fetch('https://api.theirstack.com/v1/jobs/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        job_title_or: TARGET_TITLES,
        remote: true,
        limit: 50
      })
    });
    if (resRemote.ok) {
      const data = await resRemote.json();
      const jobs = (data.data || []).map(j => ({
        title: j.job_title,
        company: j.company_name,
        location: j.job_location,
        url: j.url || '',
        postedDate: j.date_posted || j.posted_at,
        description: j.description,
        structuredSeniorityLabel: j.seniority,
        isRemote: true
      }));
      addJobs(jobs, 'TheirStack (Remote)');
    }
  } catch (err) {
    console.error('TheirStack error:', err.message);
  }
}

// 4. Adzuna
async function fetchAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return;

  const locs = ['Indore', 'Jaipur', 'Ahmedabad', 'Bhopal', 'Remote'];
  for (const loc of locs) {
    try {
      const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/1');
      url.searchParams.set('app_id', appId);
      url.searchParams.set('app_key', appKey);
      url.searchParams.set('what', 'frontend developer');
      url.searchParams.set('where', loc);
      url.searchParams.set('results_per_page', '20');

      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.results) continue;

      const jobs = data.results.map(j => ({
        title: j.title,
        company: j.company?.display_name,
        location: j.location?.display_name || loc,
        url: j.redirect_url,
        postedDate: j.created,
        description: j.description,
        isRemote: loc === 'Remote' || (j.location?.display_name || '').toLowerCase().includes('remote')
      }));

      addJobs(jobs, `Adzuna (${loc})`);
    } catch (err) {
      console.error(`Adzuna error for ${loc}:`, err.message);
    }
  }
}

// 5. HuntYourTribe
async function fetchHuntYourTribe() {
  try {
    const res = await fetch('https://huntyourtribe.com/api/external-jobs', {
      method: 'POST',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        origin: 'https://huntyourtribe.com',
        referer: 'https://huntyourtribe.com/jobs',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        page: 1,
        limit: 50,
        jobs_limit: 10,
        skills: ['React', 'Frontend', 'JavaScript']
      })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.companies) return;

    const jobs = [];
    for (const comp of data.companies) {
      if (!comp.jobs) continue;
      for (const j of comp.jobs) {
        jobs.push({
          title: j.role_name || j.title,
          company: comp.company_name,
          location: j.city || j.country,
          url: j.apply_url || '',
          postedDate: j.posted_at || j.first_seen_at,
          description: j.description || '',
          isRemote: j.work_mode === 'Remote'
        });
      }
    }
    addJobs(jobs, 'HuntYourTribe');
  } catch (err) {
    console.error('HuntYourTribe error:', err.message);
  }
}

// 6. Remotive
async function fetchRemotive() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?search=frontend&limit=50');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.jobs) return;

    const jobs = data.jobs.map(j => ({
      title: j.title,
      company: j.company_name,
      location: 'Remote',
      url: j.url,
      postedDate: j.publication_date,
      description: j.description,
      isRemote: true
    }));
    addJobs(jobs, 'Remotive');
  } catch (err) {
    console.error('Remotive error:', err.message);
  }
}

// 7. RemoteOK
async function fetchRemoteOK() {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'user-agent': 'job-search-mcp' }
    });
    if (!res.ok) return;
    const data = await res.json();
    const rawJobs = data.filter(j => j.id);

    const jobs = rawJobs.map(j => ({
      title: j.position,
      company: j.company,
      location: 'Remote',
      url: j.apply_url || j.url || '',
      postedDate: j.date,
      description: j.description,
      isRemote: true
    }));
    addJobs(jobs, 'RemoteOK');
  } catch (err) {
    console.error('RemoteOK error:', err.message);
  }
}

// 8. Jobicy
async function fetchJobicy() {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?tag=react&count=50');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.jobs) return;

    const jobs = data.jobs.map(j => ({
      title: j.jobTitle,
      company: j.companyName,
      location: 'Remote',
      url: j.url,
      postedDate: j.pubDate,
      description: j.jobDescription,
      isRemote: true
    }));
    addJobs(jobs, 'Jobicy');
  } catch (err) {
    console.error('Jobicy error:', err.message);
  }
}

// Main execution
async function main() {
  console.log('Starting job pull from all sources...');
  await Promise.allSettled([
    fetchSerpApi(),
    fetchJobsPipe(),
    fetchTheirStack(),
    fetchAdzuna(),
    fetchHuntYourTribe(),
    fetchRemotive(),
    fetchRemoteOK(),
    fetchJobicy()
  ]);

  // Deduplicate by URL/link or Title + Company + Location
  const seen = new Set();
  const uniqueJobs = [];

  for (const job of allGatheredJobs) {
    const key = job.url ? job.url.toLowerCase() : `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.location.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueJobs.push(job);
    }
  }

  const targetFile = 'C:/Users/Dell/AppData/Local/Temp/claude/D--adi-mcp/2b0cb020-ef1a-4172-ae53-db0e4d25181d/scratchpad/mcp_pull_results.json';
  const targetDir = path.dirname(targetFile);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetFile, JSON.stringify(uniqueJobs, null, 2), 'utf8');
  console.log(`\nSuccess! Wrote ${uniqueJobs.length} unique filtered jobs to:`);
  console.log(targetFile);
}

main();
