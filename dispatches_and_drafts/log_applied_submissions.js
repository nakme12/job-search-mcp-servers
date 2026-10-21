import fs from 'fs';

const trackerPath = 'applied_and_seen_tracker.json';
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));

if (!tracker.applied) tracker.applied = [];

const now = new Date().toISOString();

const worldlineRecord = {
  company: "Worldline",
  role: "Application Engineer - ReactJS Frontend",
  location: "Chennai",
  portal: "SuccessFactors ATS",
  url: "https://career2.successfactors.eu/careers?company=Worldline",
  applied_at: now,
  status: "applied",
  mode: "portal_form"
};

const tcsRecord = {
  company: "Tata Consultancy Services",
  role: "Reactjs Developer",
  location: "Bengaluru",
  portal: "LinkedIn Easy Apply",
  url: "https://in.linkedin.com/jobs/view/reactjs-developer-at-tata-consultancy-services-4478511534",
  applied_at: now,
  status: "applied",
  mode: "easy_apply"
};

// Check if already in applied
const hasWorldline = tracker.applied.some(a => a.company?.toLowerCase().includes('worldline'));
if (!hasWorldline) {
  tracker.applied.push(worldlineRecord);
  console.log('Logged Worldline to applied tracker.');
}

const hasTcs = tracker.applied.some(a => a.company?.toLowerCase().includes('tata consultancy') || a.url?.includes('4478511534'));
if (!hasTcs) {
  tracker.applied.push(tcsRecord);
  console.log('Logged TCS to applied tracker.');
}

fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2), 'utf8');
console.log('Tracker updated successfully. Total applied count:', tracker.applied.length);
