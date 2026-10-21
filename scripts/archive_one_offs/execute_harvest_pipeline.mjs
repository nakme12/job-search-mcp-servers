import fs from 'fs';
import path from 'path';
import { harvestAllTelegram } from './harvest_all_tg.mjs';
import { harvestLinkedInCards } from './harvest_linkedin.mjs';

// Clean text
function cleanText(t) {
  return (t || '').replace(/\s+/g, ' ').trim();
}

// Check if role is strictly 0-2 YOE Frontend / React / MERN
function evaluateLead(text) {
  const lower = text.toLowerCase();

  // Tech stack matching
  const hasFrontendTech = /\b(react|react\.js|reactjs|frontend|front\s*end|front-end|ui developer|web developer|next\.js|nextjs|mern)\b/i.test(lower);
  if (!hasFrontendTech) {
    return { pass: false, reason: 'NOT_FRONTEND_OR_MERN' };
  }

  // Senior / 3+ YOE strict exclusions
  const isSeniorTitle = /\b(senior|lead|principal|architect|staff|tech lead|engineering manager)\b/i.test(lower);
  if (isSeniorTitle) {
    return { pass: false, reason: 'SENIOR_TITLE_EXCLUDED' };
  }

  // Experience regex matching
  const expMatches = lower.match(/(\d+)\s*(?:-|to|\+)\s*(\d+)?\s*(?:years?|yrs?|yoe)/gi) || [];
  for (const m of expMatches) {
    const digits = m.match(/\d+/g);
    if (digits && digits.length > 0) {
      const minYears = parseInt(digits[0], 10);
      if (minYears >= 3) {
        return { pass: false, reason: 'EXCEEDS_2_YOE (' + m + ')' };
      }
    }
  }

  // Check standalone 3+ years
  if (/\b[3-9]\s*\+\s*(?:years?|yrs?|yoe)/i.test(lower)) {
    return { pass: false, reason: 'EXCEEDS_2_YOE_3_PLUS' };
  }

  // Location check (prefer PAN-India, Remote, Indore, Pune, Bangalore, etc. - no overseas on-site)
  const isAbroadOnly = /\b(dubai only|usa only|uk only|canada only|singapore only|onsite in usa|onsite in germany)\b/i.test(lower);
  if (isAbroadOnly) {
    return { pass: false, reason: 'LOCATION_OVERSEAS' };
  }

  // Extract contacts
  const emails = Array.from(new Set(text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [])).map(e => e.toLowerCase());
  const links = Array.from(new Set(text.match(/(https?:\/\/[^\s\)\>]+)/gi) || []));

  // Must have contact method
  if (emails.length === 0 && links.length === 0) {
    return { pass: false, reason: 'NO_CONTACT_FOUND' };
  }

  return {
    pass: true,
    emails,
    links,
    isIndore: /\bindore\b/i.test(lower),
    isRemote: /\bremote\b|work from home|wfh/i.test(lower)
  };
}

async function runHarvest() {
  console.log(`Starting Slot 3 Harvest Cycle at ${new Date().toLocaleTimeString()}...`);

  // Load existing records for deduplication
  const histPath = path.resolve('total_historical_except_today.json');
  const todayPath = path.resolve('total_todays_2026-10-14.json');

  const rawHist = JSON.parse(fs.readFileSync(histPath, 'utf8'));
  const histJobs = Array.isArray(rawHist) ? rawHist : (rawHist.jobs || []);

  const rawToday = JSON.parse(fs.readFileSync(todayPath, 'utf8'));
  const todayJobs = Array.isArray(rawToday) ? rawToday : (rawToday.jobs || []);

  // Collect historical deduplication keys (URLs, emails, companies)
  const histKeys = new Set();
  const histEmails = new Set();
  const histUrls = new Set();

  function registerHistorical(job) {
    if (job.url) histUrls.add(job.url.toLowerCase().trim());
    if (job.recipient_or_url) {
      const val = job.recipient_or_url.toLowerCase().trim();
      if (val.includes('@')) histEmails.add(val);
      else histUrls.add(val);
    }
    if (job.company) {
      histKeys.add(job.company.toLowerCase().trim());
    }
    if (job.author_name) {
      histKeys.add(job.author_name.toLowerCase().trim());
    }
  }

  histJobs.forEach(registerHistorical);

  // Also collect today's keys to avoid intra-day duplicates
  const todayKeys = new Set();
  todayJobs.forEach(j => {
    if (j.url) todayKeys.add(j.url.toLowerCase().trim());
    if (j.company) todayKeys.add(j.company.toLowerCase().trim());
    if (j.company_name) todayKeys.add(j.company_name.toLowerCase().trim());
    if (j.hr_email) todayKeys.add(j.hr_email.toLowerCase().trim());
    if (j.author_name) todayKeys.add(j.author_name.toLowerCase().trim());
    if (j.recipient_or_url) todayKeys.add(j.recipient_or_url.toLowerCase().trim());
  });

  console.log(`Indexed ${histJobs.length} historical records and ${todayJobs.length} today's records.`);

  // 1. Harvest Telegram
  const tgPosts = await harvestAllTelegram();

  // 2. Harvest LinkedIn
  const liCards = await harvestLinkedInCards();

  const newlyAdded = [];
  const skippedDuplicates = [];
  const rejectedFiltering = [];

  // Next available ID for today's file
  let nextId = todayJobs.length > 0 ? Math.max(...todayJobs.map(j => Number(j.id) || 0)) + 1 : 1;

  // Process Telegram posts
  for (const p of tgPosts) {
    const evalRes = evaluateLead(p.text);
    if (!evalRes.pass) {
      rejectedFiltering.push({ source: 'Telegram @' + p.channel, reason: evalRes.reason, snippet: p.text.slice(0, 100) });
      continue;
    }

    const primaryEmail = evalRes.emails[0] || null;
    const primaryLink = evalRes.links[0] || p.postUrl;

    // Check duplicate against historical
    const isHistEmail = primaryEmail && histEmails.has(primaryEmail);
    const isHistUrl = primaryLink && histUrls.has(primaryLink.toLowerCase());

    if (isHistEmail || isHistUrl) {
      skippedDuplicates.push({
        source: 'Telegram @' + p.channel,
        contact: primaryEmail || primaryLink,
        status: 'SKIPPED_DUPLICATE_HISTORICAL'
      });
      continue;
    }

    // Check intra-day duplicate
    const isTodayDup = (primaryEmail && todayKeys.has(primaryEmail)) || (primaryLink && todayKeys.has(primaryLink.toLowerCase()));
    if (isTodayDup) {
      continue;
    }

    // Determine clean role & company from text
    let role = 'Frontend / React Developer';
    if (/\bmern\b/i.test(p.text)) role = 'MERN Stack Developer';
    else if (/\bnext\.?js\b/i.test(p.text)) role = 'Next.js / Frontend Developer';

    let location = 'India (Remote / Hybrid)';
    if (evalRes.isIndore) location = 'Indore, MP';
    else if (evalRes.isRemote) location = 'Remote, India';

    // Extract potential company
    const lines = p.text.split('\n').map(l => l.trim()).filter(Boolean);
    let company = 'Telegram Tech Community (@' + p.channel + ')';
    for (const l of lines) {
      const compMatch = l.match(/(?:company|at|organization|firm|client):\s*([a-zA-Z0-9\s\.\-_]{3,40})/i);
      if (compMatch) {
        company = compMatch[1].trim();
        break;
      }
    }

    const newJob = {
      id: nextId++,
      company: company,
      role: role,
      location: location,
      url: primaryLink,
      source: `Telegram (@${p.channel})`,
      resume: role.includes('React') || role.includes('MERN') ? 'Pratik Patidar Resume - React Developer.pdf' : 'Pratik Patidar Resume - Frontend Engineer.pdf',
      status: 'APPROVED_FOR_VERIFY',
      recipient_or_url: primaryEmail || primaryLink,
      hr_email: primaryEmail || '',
      experience: '0-2 YOE (Fresher/Junior)',
      timestamp: new Date().toISOString(),
      raw_snippet: p.text.slice(0, 300)
    };

    newlyAdded.push(newJob);
    todayJobs.push(newJob);
    if (primaryEmail) todayKeys.add(primaryEmail);
    if (primaryLink) todayKeys.add(primaryLink.toLowerCase());
  }

  // Process LinkedIn cards
  for (const card of liCards) {
    const evalRes = evaluateLead(card.text);
    if (!evalRes.pass) {
      rejectedFiltering.push({ source: 'LinkedIn', reason: evalRes.reason, snippet: card.text.slice(0, 100) });
      continue;
    }

    const primaryEmail = evalRes.emails[0] || null;
    const primaryLink = evalRes.links[0] || (card.urn ? `https://www.linkedin.com/feed/update/${card.urn}` : 'https://www.linkedin.com');

    // Check duplicate against historical
    const isHistEmail = primaryEmail && histEmails.has(primaryEmail);
    const isHistAuthor = card.author && histKeys.has(card.author.toLowerCase());

    if (isHistEmail || isHistAuthor) {
      skippedDuplicates.push({
        source: 'LinkedIn',
        contact: primaryEmail || card.author,
        status: 'SKIPPED_DUPLICATE_HISTORICAL'
      });
      continue;
    }

    // Check intra-day duplicate
    const isTodayDup = (primaryEmail && todayKeys.has(primaryEmail)) || (card.author && todayKeys.has(card.author.toLowerCase()));
    if (isTodayDup) {
      continue;
    }

    let role = 'React Developer';
    if (/\bmern\b/i.test(card.text)) role = 'MERN Stack Developer';
    else if (/\bfrontend\b/i.test(card.text)) role = 'Frontend Developer';

    let location = 'India / Remote';
    if (evalRes.isIndore) location = 'Indore, MP';
    else if (evalRes.isRemote) location = 'Remote';

    const newJob = {
      id: nextId++,
      company: card.authorTitle || card.author || 'LinkedIn Recruiter',
      role: role,
      location: location,
      url: primaryLink,
      source: 'LinkedIn 0-2 YOE Feed Card',
      resume: 'Pratik Patidar Resume - React Developer.pdf',
      status: 'APPROVED_FOR_VERIFY',
      recipient_or_url: primaryEmail || primaryLink,
      hr_email: primaryEmail || '',
      author_name: card.author,
      author_title: card.authorTitle,
      experience: '0-2 YOE',
      timestamp: new Date().toISOString(),
      raw_snippet: card.text.slice(0, 300)
    };

    newlyAdded.push(newJob);
    todayJobs.push(newJob);
    if (primaryEmail) todayKeys.add(primaryEmail);
    if (card.author) todayKeys.add(card.author.toLowerCase());
  }

  // Update total_todays_2026-10-14.json
  const updatedToday = {
    date: '2026-10-14',
    description: 'All raw job findings harvested today across all platforms',
    total: todayJobs.length,
    jobs: todayJobs
  };

  fs.writeFileSync(todayPath, JSON.stringify(updatedToday, null, 2));

  console.log(`\n================ HARVEST RESULTS ================`);
  console.log(`New fresh leads appended: ${newlyAdded.length}`);
  console.log(`Duplicates skipped (historical): ${skippedDuplicates.length}`);
  console.log(`Rejected (failed 0-2 YOE or tech filter): ${rejectedFiltering.length}`);
  console.log(`Total jobs now in total_todays_2026-10-14.json: ${todayJobs.length}`);
  console.log(`=================================================`);

  fs.writeFileSync('scripts/last_harvest_report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    newlyAddedCount: newlyAdded.length,
    skippedDuplicatesCount: skippedDuplicates.length,
    rejectedFilteringCount: rejectedFiltering.length,
    newlyAdded,
    skippedDuplicates
  }, null, 2));
}

runHarvest().catch(err => {
  console.error('Fatal execution error:', err);
});
