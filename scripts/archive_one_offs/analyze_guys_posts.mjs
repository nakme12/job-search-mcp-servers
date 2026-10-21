import fs from 'fs';

const tracker = JSON.parse(fs.readFileSync('applied_and_seen_tracker.json', 'utf8'));
const msgs = JSON.parse(fs.readFileSync('scripts/guys_dont_scraped_posts.json', 'utf8'));

const appliedSet = new Set();
tracker.applied.forEach(a => {
  if (a.company) appliedSet.add(a.company.toLowerCase().trim());
  if (a.recipient_or_url) appliedSet.add(a.recipient_or_url.toLowerCase().trim());
});

const seen = new Set();
const unique = [];
msgs.forEach(m => {
  const clean = m.text.replace(/\s+/g, ' ').trim();
  const key = clean.slice(0, 100);
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(m);
  }
});

console.log('Total unique posts in chat:', unique.length);

const results = [];
unique.forEach((p, idx) => {
  const text = p.text.replace(/\s+/g, ' ');
  // Extract email if any
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  // Extract date mention
  let dateMention = 'Recent';
  if (text.includes('TODAY')) dateMention = 'Today (Oct 12)';
  else if (text.includes('OCT 11')) dateMention = 'Oct 11';
  else if (text.includes('OCT 10')) dateMention = 'Oct 10';
  else if (text.includes('OCT 9')) dateMention = 'Oct 9';
  else if (text.includes('OCT 8')) dateMention = 'Oct 8';
  else if (text.includes('OCT 7')) dateMention = 'Oct 7';
  else if (text.includes('OCT 6')) dateMention = 'Oct 6';
  else if (text.includes('AUG')) dateMention = 'August (Older)';
  else if (text.includes('SEP')) dateMention = 'September (Older)';

  // Check relevance to Pratik (Frontend, React, Next, MERN, Web)
  const isRelevant = /react|frontend|front end|next\.js|mern|javascript|web developer|html|ui/i.test(text);

  results.push({
    id: idx + 1,
    date: dateMention,
    isRelevant,
    emails,
    links: p.links,
    textSnippet: text.slice(0, 300)
  });
});

fs.writeFileSync('scripts/guys_dont_analyzed.json', JSON.stringify(results, null, 2));

const last7Days = results.filter(r => !r.date.includes('August') && !r.date.includes('September'));
console.log('Posts in last 7 days (October):', last7Days.length);
last7Days.forEach(r => {
  console.log(`\n[#${r.id}] Date: ${r.date} | Relevant: ${r.isRelevant} | Emails: ${r.emails.join(', ')}`);
  console.log('Text:', r.textSnippet);
  console.log('Links:', r.links.slice(0, 3));
});
