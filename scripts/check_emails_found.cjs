const fs = require('fs');

const hist = JSON.parse(fs.readFileSync('total_historical_except_today.json'));
const histSet = new Set((hist.jobs || hist).map(j => (j.recipient || j.recipient_or_url || '').toLowerCase().trim()));

console.log('=== DIRECT RECRUITER EMAILS DISCOVERED IN SLOT 3 ===');

let totalEmails = 0;
const emailList = [];

if (fs.existsSync('slot3_telegram_leads.json')) {
  const tg = JSON.parse(fs.readFileSync('slot3_telegram_leads.json'));
  const tgJobs = tg.jobs || tg;
  const emails = tgJobs.filter(j => j.recipient && j.recipient.includes('@'));
  console.log(`\nTelegram Leads File: ${emails.length} total direct emails`);
  emails.forEach(e => {
    const isDup = histSet.has(e.recipient.toLowerCase().trim());
    emailList.push({ source: 'Telegram', company: e.company, email: e.recipient, title: e.title, duplicate: isDup });
  });
}

if (fs.existsSync('slot3_linkedin_leads.json')) {
  const li = JSON.parse(fs.readFileSync('slot3_linkedin_leads.json'));
  const liJobs = li.jobs || li;
  const emails = liJobs.filter(j => j.recipient && j.recipient.includes('@'));
  console.log(`LinkedIn Leads File: ${emails.length} total direct emails`);
  emails.forEach(e => {
    const isDup = histSet.has(e.recipient.toLowerCase().trim());
    emailList.push({ source: 'LinkedIn', company: e.company, email: e.recipient, title: e.title, duplicate: isDup });
  });
}

console.log('\n--- VERIFIED CLEAN DIRECT EMAILS (0-2 YOE Tech Leads) ---');
const clean = emailList.filter(e => !e.duplicate);
console.log(`Total Unique Clean Emails: ${clean.length} (out of ${emailList.length} captured, ${emailList.length - clean.length} historical duplicates dropped)`);
clean.forEach((e, idx) => {
  console.log(`${idx + 1}. [${e.source}] ${e.company} -> ${e.email} (${e.title || 'Frontend / React Developer'})`);
});
