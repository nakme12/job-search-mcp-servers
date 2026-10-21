import fs from 'fs';

const jobs = JSON.parse(fs.readFileSync('devhub_parsed_jobs.json', 'utf8'));

console.log('=== JOBS 1 to 27 DETAILED ===');
jobs.slice(0, 27).forEach(j => {
  const emails = j.fullText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
  console.log(`[Job ${j.id}] ${j.fullText.replace(/\n+/g, ' ').slice(0, 160)}`);
  console.log(`Emails: ${emails.join(', ')}`);
  console.log('---');
});
