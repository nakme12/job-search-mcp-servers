import fs from 'fs';

const todays = JSON.parse(fs.readFileSync('todays_applied.json', 'utf8'));

console.log('Today total count:', todays.applied.length);
todays.applied.forEach((a, i) => {
  const comp = a.company || 'Unknown';
  const role = a.role || a.title || 'Role';
  const method = a.applied_via || a.appliedVia || 'Email';
  const email = a.recipientEmail || a.email || a.contact || 'No direct email';
  console.log(`${i+1}. ${comp} | ${role} | ${email} | Method: ${method}`);
});
