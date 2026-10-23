const fs = require('fs');

const hist = JSON.parse(fs.readFileSync('total_historical_except_today.json', 'utf8'));
const applied = JSON.parse(fs.readFileSync('applied_lifetime_except_today.json', 'utf8'));
const f4 = JSON.parse(fs.readFileSync('verified_todays_2026-10-16_shift1.json', 'utf8'));

const histUrls = new Set((hist.jobs || hist || []).map(j => (j.url || j.recipient || '').toLowerCase()).filter(Boolean));
const appliedUrls = new Set((applied.jobs || applied || []).map(j => (j.url || j.recipient || '').toLowerCase()).filter(Boolean));
const f4Urls = new Set((f4.jobs || []).map(j => (j.url || j.recipient || '').toLowerCase()).filter(Boolean));

const discoveredLeads = [
  {
    company: "Engineer Master Solutions Pvt Ltd",
    role: "MERN Stack Developer",
    location: "Indore, MP",
    email: "hr@engineermaster.in",
    resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
    source: "LinkedIn Group",
    days: "Today (18h ago)"
  },
  {
    company: "FxBytes Technologies Pvt Ltd",
    role: "Full Stack / React Developer",
    location: "Indore, MP",
    email: "bharti.shweta@fxbytes.com",
    resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
    source: "LinkedIn Group (Shweta Bharti - HR Manager)",
    days: "Wednesday (2 days ago)"
  },
  {
    company: "CyberNative Tech",
    role: "Full Stack Developer (Node/MERN)",
    location: "India / Remote",
    email: "hr@cybernative.in",
    resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
    source: "LinkedIn Group",
    days: "Tuesday (3 days ago)"
  },
  {
    company: "World Web Technology",
    role: "Frontend / React Developer",
    location: "India / Hybrid",
    email: "career@worldwebtechnology.com",
    resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
    source: "LinkedIn Group",
    days: "Monday (4 days ago)"
  },
  {
    company: "WhiteStone Infotech",
    role: "Full Stack / MERN Developer",
    location: "India / Remote",
    email: "hr@whitestoneinfotech.com",
    resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
    source: "LinkedIn Group",
    days: "Sunday (5 days ago)"
  },
  {
    company: "Credara Capital",
    role: "Web / Frontend Tech",
    location: "India",
    email: "sneha@credaracap.com",
    resume: "Pratik Patidar Resume - MERN Full Stack.pdf",
    source: "LinkedIn Group",
    days: "6 days ago"
  }
];

console.log('=== DEDUPLICATION AUDIT AGAINST HISTORICAL & APPLIED ===');
const cleanToAdd = [];

discoveredLeads.forEach(lead => {
  const emailLower = lead.email.toLowerCase();
  const isHist = histUrls.has(emailLower) || histUrls.has(`mailto:${emailLower}`);
  const isApplied = appliedUrls.has(emailLower) || appliedUrls.has(`mailto:${emailLower}`);
  const isF4 = f4Urls.has(emailLower) || f4Urls.has(`mailto:${emailLower}`);

  console.log(`\nCompany: ${lead.company} (${lead.email})`);
  console.log(`  Historical: ${isHist} | Applied: ${isApplied} | In File 4: ${isF4}`);

  if (!isHist && !isApplied && !isF4) {
    cleanToAdd.push(lead);
    console.log(`  -> RESULT: CLEAN TO ADD ✅`);
  } else {
    console.log(`  -> RESULT: ALREADY PRESENT / DUPLICATE 🚫`);
  }
});

console.log(`\nTotal Fresh Clean Leads to Add: ${cleanToAdd.length}`);

// Add clean leads to File 4
cleanToAdd.forEach(item => {
  const newJob = {
    id: f4.jobs.length + 1,
    company: item.company,
    role: item.role,
    location: item.location,
    url: `mailto:${item.email}`,
    recipient: item.email,
    source: item.source,
    resume_mapped: item.resume,
    status: "READY_FOR_DIRECT_EMAIL",
    discovered_at: new Date().toISOString(),
    live_date_parsed: item.days,
    audited_at: new Date().toISOString(),
    channel: "DIRECT_RECRUITER_EMAIL"
  };
  f4.jobs.push(newJob);
});

f4.total = f4.jobs.length;
fs.writeFileSync('verified_todays_2026-10-16_shift1.json', JSON.stringify(f4, null, 2));
console.log(`\nUpdated File 4! New Total Verified Jobs: ${f4.total}`);
