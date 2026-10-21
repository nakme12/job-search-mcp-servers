const fs = require('fs');
const path = require('path');

const messages = JSON.parse(fs.readFileSync('scripts/guys_group_all_messages.json', 'utf8'));
const hist = JSON.parse(fs.readFileSync('total_historical_except_today.json', 'utf8'));
const applied = JSON.parse(fs.readFileSync('applied_lifetime_except_today.json', 'utf8'));
const f4 = JSON.parse(fs.readFileSync('verified_todays_2026-10-16_shift1.json', 'utf8'));

const histUrls = new Set((hist.jobs || hist || []).map(j => (j.url || '').toLowerCase()).filter(Boolean));
const appliedUrls = new Set((applied.jobs || applied || []).map(j => (j.url || '').toLowerCase()).filter(Boolean));

console.log(`Loaded ${messages.length} total messages from group.`);

const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const jobsFound = [];

messages.forEach((m, idx) => {
  const text = m.text || '';
  const emails = (text.match(emailRegex) || []).filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('linkedin.com'));
  const links = (m.links || []).filter(l => !l.includes('linkedin.com/in/') && !l.includes('linkedin.com/company/') && !l.includes('search/results'));

  const isTechJob = /developer|engineer|frontend|react|mern|full stack|node|ui/i.test(text);
  const isSenior = /senior|lead|architect|principal|5\+|6\+|7\+|8\+/i.test(text);

  if (isTechJob && (emails.length > 0 || links.length > 0)) {
    jobsFound.push({
      idx,
      author: m.author,
      time: m.time,
      emails,
      links,
      isSenior,
      snippet: text.slice(0, 200).replace(/\n+/g, ' ')
    });
  }
});

console.log(`Identified ${jobsFound.length} potential job posts in group:`);
jobsFound.forEach(j => {
  console.log(`\n[#${j.idx}] Author: ${j.author} | Time: ${j.time} | Senior: ${j.isSenior}`);
  console.log(`  Snippet: ${j.snippet}`);
  console.log(`  Emails: ${j.emails.join(', ') || 'None'}`);
  console.log(`  Links: ${j.links.join(', ') || 'None'}`);
});
