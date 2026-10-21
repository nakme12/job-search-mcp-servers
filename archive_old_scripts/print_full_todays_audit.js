import fs from 'fs';

const todays = JSON.parse(fs.readFileSync('todays_applied.json', 'utf8'));

console.log('========================================================================================');
console.log(`                   TODAY'S VERIFIED APPLICATION LOG (2026-10-12)                        `);
console.log('========================================================================================');
console.log(`TOTAL DELIVERED & CONFIRMED: ${todays.total_applied_today} / 50 (TARGET REMAINING: ${50 - todays.total_applied_today})`);
console.log('----------------------------------------------------------------------------------------');

todays.applied.forEach((a, idx) => {
  const company = (a.company || 'Unknown').padEnd(25, ' ');
  const role = (a.role || a.title || 'Role').slice(0, 30).padEnd(32, ' ');
  const method = (a.applied_via || a.channel || a.appliedVia || 'Direct Email').padEnd(20, ' ');
  const contact = (a.recipientEmail || a.recipient_or_url || a.contact || 'N/A').slice(0, 30);
  console.log(`${String(idx + 1).padStart(2, ' ')}. ${company} | ${role} | ${method} | ${contact}`);
});
console.log('========================================================================================');
