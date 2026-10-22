const fs = require('fs');
const path = require('path');

const dmLeads = JSON.parse(fs.readFileSync('C:\\mcp\\dm_extracted_leads.json', 'utf8'));

// Load deduplication files
const appliedTodayPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const appliedToday = fs.existsSync(appliedTodayPath) ? JSON.parse(fs.readFileSync(appliedTodayPath, 'utf8')) : { jobs: [] };
const appliedTodayEmails = new Set((appliedToday.jobs || []).map(j => (j.recipient || '').toLowerCase().trim()));

const lifetimeAppliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_lifetime_except_today.json';
const lifetimeApplied = fs.existsSync(lifetimeAppliedPath) ? JSON.parse(fs.readFileSync(lifetimeAppliedPath, 'utf8')) : { jobs: [] };
const lifetimeEmails = new Set(((lifetimeApplied.jobs || lifetimeApplied) || []).map(j => (j.recipient || j.recipient_or_url || j.email || '').toLowerCase().trim()));

console.log(`Total extracted raw leads: ${dmLeads.length}`);
console.log(`Applied today emails: ${appliedTodayEmails.size}`);
console.log(`Lifetime applied emails: ${lifetimeEmails.size}`);

const roleAllowedKeywords = ['react', 'frontend', 'front end', 'mern', 'full stack', 'fullstack', 'web developer', 'ui developer', 'software engineer', 'developer'];
const roleBannedKeywords = ['python', 'devops', 'android', 'ios', 'flutter', 'react native', 'qa', 'tester', 'sales', 'recruiter', 'hr ', 'marketing'];

const verifiedUniqueLeads = [];
const seenEmails = new Set();

for (const item of dmLeads) {
  const text = item.text.toLowerCase();
  
  // Check banned YOE: 3+, 3-5, 4+, 5+, senior, lead
  if (text.includes('3+') || text.includes('3-5') || text.includes('4+') || text.includes('5+') || text.includes('senior') || text.includes('sr.') || text.includes('lead developer')) {
    continue;
  }

  // Check role eligibility
  const hasAllowedRole = roleAllowedKeywords.some(kw => text.includes(kw));
  const hasBannedRole = roleBannedKeywords.some(kw => text.includes(kw));

  if (!hasAllowedRole || hasBannedRole) {
    continue;
  }

  for (const email of item.emails) {
    const cleanEmail = email.toLowerCase().trim();
    if (seenEmails.has(cleanEmail)) continue;
    if (appliedTodayEmails.has(cleanEmail)) {
      console.log(`[Already Applied Today]: ${cleanEmail}`);
      continue;
    }
    if (lifetimeEmails.has(cleanEmail)) {
      console.log(`[Already Applied Lifetime]: ${cleanEmail}`);
      continue;
    }

    seenEmails.add(cleanEmail);
    verifiedUniqueLeads.push({
      email: cleanEmail,
      rawText: item.text.substring(0, 300),
      postLinks: item.postLinks
    });
  }
}

console.log(`\n=== VERIFIED UNIQUE UNAPPLIED LEADS FROM LINKEDIN DMS: ${verifiedUniqueLeads.length} ===`);
verifiedUniqueLeads.forEach((l, i) => {
  console.log(`[#${i+1}] Email: ${l.email}`);
  console.log(`    Snippet: ${l.rawText.substring(0, 150)}...`);
  if (l.postLinks && l.postLinks.length > 0) console.log(`    Link: ${l.postLinks[0]}`);
});

fs.writeFileSync('C:\\mcp\\dm_verified_unapplied_leads.json', JSON.stringify(verifiedUniqueLeads, null, 2), 'utf8');
