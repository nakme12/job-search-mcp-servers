const fs = require('fs');

const histData = JSON.parse(fs.readFileSync('total_historical_except_today.json', 'utf8') || '{}');
const hist = histData.jobs || [];
const deadEmails = JSON.parse(fs.readFileSync('dead_recruiter_emails.json', 'utf8') || '[]');
const file3 = JSON.parse(fs.readFileSync('total_todays_2026-10-16_shift1.json', 'utf8'));

console.log('--- HARVESTED TG LEADS AUDIT REPORT ---');
const tgHarvested = file3.jobs.filter(j => j.source && j.source.includes('Telegram'));

tgHarvested.forEach(j => {
  const urlCheck = hist.some(h => (h.url && h.url === j.url) || (h.apply_url && h.apply_url === j.url));
  const emailCheck = j.recipient ? (deadEmails.includes(j.recipient.toLowerCase()) || hist.some(h => (h.recipient && h.recipient.toLowerCase() === j.recipient.toLowerCase()) || (h.email && h.email.toLowerCase() === j.recipient.toLowerCase()))) : false;
  
  console.log(JSON.stringify({
    company: j.company,
    role: j.role,
    status: j.status,
    histDup: urlCheck,
    deadOrHistEmail: emailCheck,
    recipientOrUrl: j.recipient || j.url
  }, null, 2));
});
