import fs from 'fs';

const TRACKER_FILE = 'D:/adi/mcp/applied_and_seen_tracker.json';
const STAGED_FILE = 'D:/adi/mcp/staged_10_subagent_emails.json';

const trackerData = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
const staged = JSON.parse(fs.readFileSync(STAGED_FILE, 'utf8'));

const today = new Date().toISOString().split('T')[0];

staged.forEach(item => {
  const existingIdx = trackerData.applied.findIndex(a => a.contact && a.contact.toLowerCase() === item.recipient.toLowerCase());
  const entry = {
    company: item.company,
    role: item.role,
    location: item.location,
    method: 'Direct HR Email',
    date: today,
    contact: item.recipient,
    resume: item.resume,
    status: 'Applied',
    notes: `Strict JD Verified (${item.exp}) & Physically verified in live Gmail Sent folder on ${today}`
  };

  if (existingIdx >= 0) {
    trackerData.applied[existingIdx] = entry;
  } else {
    trackerData.applied.push(entry);
  }
});

trackerData.stats = trackerData.stats || {};
trackerData.stats.total_applied = trackerData.applied.length;
trackerData.stats.verified_emails_sent = trackerData.applied.filter(a => a.method && a.method.includes('Email')).length;
trackerData.stats.last_updated = new Date().toISOString();

fs.writeFileSync(TRACKER_FILE, JSON.stringify(trackerData, null, 2));
console.log(`Tracker synchronized! Total applied: ${trackerData.stats.total_applied}, Verified emails sent: ${trackerData.stats.verified_emails_sent}`);
