import fs from 'fs';

const tracker = JSON.parse(fs.readFileSync('applied_and_seen_tracker.json', 'utf8'));
const appliedEmails = new Set();
const appliedCompanies = new Set();

tracker.applied.forEach(a => {
  if (a.company) appliedCompanies.add(a.company.toLowerCase().trim());
  if (a.recipient_or_url) appliedEmails.add(a.recipient_or_url.toLowerCase().trim());
});

const jobs = JSON.parse(fs.readFileSync('scripts/guys_dont_analyzed.json', 'utf8'));

// Filter only October (last 7 days / fresh) and relevant
const freshJobs = jobs.filter(j => !j.date.includes('August') && !j.date.includes('September') && j.isRelevant);

const auditReport = [];

freshJobs.forEach(job => {
  const text = job.textSnippet;
  
  // Extract company name heuristically
  let company = 'Direct LinkedIn Lead';
  if (text.includes('WagerGeeks')) company = 'WagerGeeks';
  else if (text.includes('CodeStrat')) company = 'CodeStrat Labs';
  else if (text.includes('DayHawk')) company = 'DayHawk Consultant';
  else if (text.includes('Ivory Squid') || text.includes('ivorysquid')) company = 'Ivory Squid';
  else if (text.includes('CodeXorr') || text.includes('codexorr')) company = 'CodeXorr';
  else if (text.includes('Credara Capital') || text.includes('credaracap')) company = 'Credara Capital';
  else if (text.includes('Rayudu Group') || text.includes('Crontle') || text.includes('crontle')) company = 'Crontle (Rayudu Group)';
  else if (text.includes('High Tech Infosystems')) company = 'High Tech Infosystems';
  else if (text.includes('QuickHire.me') || text.includes('quickhire')) company = 'QuickHire.me (Noida)';
  else if (text.includes('World Web Technology') || text.includes('worldwebtechnology')) company = 'World Web Technology';
  else if (text.includes('Whitestone') || text.includes('whitestoneinfotech')) company = 'Whitestone Infotech';
  else if (text.includes('Larana Global')) company = 'Larana Global Tech';
  else if (text.includes('HyperBeans')) company = 'HyperBeans Inc';
  else if (text.includes('Steve’s AI Lab')) company = 'Steve’s AI Lab';

  // Extract contact or url
  const email = job.emails[0] || (job.links.find(l => l.includes('http') && !l.includes('search/results')) || 'LinkedIn Post Direct');

  // Check if applied
  const isAppliedEmail = email && appliedEmails.has(email.toLowerCase().trim());
  const isAppliedComp = appliedCompanies.has(company.toLowerCase().trim());
  const isApplied = isAppliedEmail || isAppliedComp;

  // Determine Role
  let role = 'Frontend / React Developer';
  if (/mern/i.test(text)) role = 'MERN Stack Developer';
  else if (/react\.js \+ next\.js/i.test(text)) role = 'Frontend Developer (React.js + Next.js)';
  else if (/full stack/i.test(text)) role = 'Full Stack Developer';
  else if (/junior front-end/i.test(text)) role = 'Junior Front-End Software Engineer';

  auditReport.push({
    company,
    role,
    contact: email,
    allEmails: job.emails,
    status: isApplied ? 'ALREADY APPLIED' : 'UNAPPLIED (FRESH FIT)',
    textSnippet: text.slice(0, 180),
    postUrl: job.links.find(l => l.includes('linkedin.com/feed/update')) || job.links[0] || ''
  });
});

// Deduplicate by company + contact
const uniqueAudit = [];
const seenKey = new Set();
auditReport.forEach(item => {
  const k = (item.company + '|' + item.contact).toLowerCase();
  if (!seenKey.has(k)) {
    seenKey.add(k);
    uniqueAudit.push(item);
  }
});

fs.writeFileSync('scripts/guys_dont_final_filtered.json', JSON.stringify(uniqueAudit, null, 2));

console.log('Total Vetted Leads in Last 7 Days:', uniqueAudit.length);
console.log('Already Applied count:', uniqueAudit.filter(u => u.status === 'ALREADY APPLIED').length);
console.log('Unapplied Fresh Best-Fit count:', uniqueAudit.filter(u => u.status !== 'ALREADY APPLIED').length);
