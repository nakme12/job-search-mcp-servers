import fs from 'fs';

const jobs = JSON.parse(fs.readFileSync('devhub_parsed_jobs.json', 'utf8'));

console.log('=== FULL AUDIT OF ALL 48 POSTS IN CHANNEL ===\n');

jobs.forEach(j => {
  const text = j.fullText;
  const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
  console.log(`[ID: ${j.id}] Company: ${j.company || 'Not in header'} | Role: ${j.role || 'Not in header'} | Exp: ${j.exp || 'Not specified'}`);
  console.log(`Snippet: ${text.replace(/\n+/g, ' ').slice(0, 150)}`);
  console.log(`Emails: ${emails.join(', ') || 'No email (Portal link)'}`);
  console.log('--------------------------------------------------');
});
