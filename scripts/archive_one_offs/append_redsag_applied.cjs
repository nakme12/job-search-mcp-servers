const fs = require('fs');
const filePath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const exists = data.jobs.some(j => j.company.toLowerCase().includes('redsag'));
if (!exists) {
  data.jobs.push({
    company: 'Redsag',
    role: 'Junior Frontend Developer',
    recipient_or_url: 'https://www.red-sag.com/careers/apply/junior-frontend-developer',
    channel: 'Direct Company Career Portal',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    timestamp: '2026-10-14T08:01:08.000Z',
    status: 'Applied & Submitted (Verified in DOM: Application Submitted! Thank you for applying to the Junior Frontend Developer position)',
    proof_screenshots: [
      'screenshots/2026-10-14/redsag_fe_presubmit.png',
      'screenshots/2026-10-14/redsag_fe_postsubmit.png'
    ],
    notes: 'Direct career portal submission confirmed. API response 200 OK (/api/forms/submit). Physical DOM assertion: Application Submitted! Thank you for applying to the Junior Frontend Developer position. Submitted: 14/10/2026.'
  });
  data.total = data.jobs.length;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Successfully logged Redsag to applied_todays_2026-10-14.json. Total applied:', data.total);
} else {
  console.log('Redsag already present in applied_todays_2026-10-14.json');
}
