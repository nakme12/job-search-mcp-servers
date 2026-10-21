import fs from 'fs';

const discovered = JSON.parse(fs.readFileSync('discovered_jobs_7days.json', 'utf8'));
const applied = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8')).applied;
const appliedIdentifiers = new Set(applied.map(a => (a.url || a.jobUrl || a.recipientEmail || a.email || '').toLowerCase()));

const pending = discovered.filter(j => {
  const identifier = (j.url || j.jobUrl || j.email || '').toLowerCase();
  const isApplied = appliedIdentifiers.has(identifier);
  const status = (j.status || '').toLowerCase();
  return !isApplied && status !== 'skipped' && status !== 'rejected' && status !== 'verified_submitted';
});

console.log('Pending roles in discovered_jobs_7days.json:', pending.length);
if (pending.length > 0) {
  const nextRole = pending[0];
  console.log('Target for deep verification:');
  console.log('Company:', nextRole.company);
  console.log('Title:', nextRole.title || nextRole.role);
  console.log('URL:', nextRole.url || nextRole.jobUrl);
  console.log('Full Object:', JSON.stringify(nextRole, null, 2));
}
