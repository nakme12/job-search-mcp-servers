import fs from 'fs';

let todays = JSON.parse(fs.readFileSync('todays_applied.json', 'utf8'));
let weekly = JSON.parse(fs.readFileSync('weekly_applied.json', 'utf8'));

const newApp = {
  id: 'lifease-solutions-llp-1360632',
  company: 'Lifease Solutions LLP',
  role: 'Full Stack Developer (1-4 Years)',
  platform: 'PlacementIndia',
  url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-lifease-solutions-llp-at-sector-135-noida-1360632.htm',
  applied_at: new Date().toISOString(),
  applied_via: 'Portal Direct Form Submission',
  resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
  proof: 'screenshots/2026-10-12/lifease_final_form_submitted.png',
  server_response: '{"response":["success","1360632"]}',
  status: 'VERIFIED_SUBMITTED'
};

if (!todays.applied.find(x => x.id === newApp.id)) {
  todays.applied.push(newApp);
  todays.total_applied_today = todays.applied.length;
  fs.writeFileSync('todays_applied.json', JSON.stringify(todays, null, 2));
}

if (!weekly.applied.find(x => x.id === newApp.id)) {
  weekly.applied.push(newApp);
  weekly.total_lifetime_applied = weekly.applied.length;
  fs.writeFileSync('weekly_applied.json', JSON.stringify(weekly, null, 2));
}

console.log('Successfully recorded! Today total:', todays.total_applied_today, '| Lifetime total:', weekly.total_lifetime_applied);
