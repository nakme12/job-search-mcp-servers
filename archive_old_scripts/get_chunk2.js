import fs from 'fs';

const csvText = fs.readFileSync('claude_findings_react_mern_jobs_2026-10-13.csv', 'utf8');
const tracker = JSON.parse(fs.readFileSync('applied_and_seen_tracker.json', 'utf8'));
const appliedList = tracker.applied || [];
const appliedUrls = new Set(appliedList.map(a => (a.url || a.link || '').toLowerCase().trim()).filter(Boolean));
const appliedCompanies = new Set(appliedList.map(a => (a.company || '').toLowerCase().trim()).filter(Boolean));

function parseCSVLine(text) {
  let p = '', inQuotes = false, fields = [];
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      fields.push(p.trim());
      p = '';
    } else {
      p += c;
    }
  }
  fields.push(p.trim());
  return fields;
}

const lines = csvText.split('\n').filter(l => l.trim().length > 0);
const rows = lines.slice(1).map(l => parseCSVLine(l));
const confirmedGood = rows.filter(r => r[1] === 'CONFIRMED_GOOD');
const validGood = confirmedGood.filter(r => {
  const normLink = (r[6] || '').toLowerCase().trim();
  const normComp = (r[2] || '').toLowerCase().trim();
  return !appliedUrls.has(normLink) && !appliedCompanies.has(normComp) && normLink.length > 0;
});

console.log('Chunk 2 (Jobs 6 to 10):');
validGood.slice(5, 10).forEach((r, idx) => {
  console.log(`${idx + 6}. Company: ${r[2]} | Role: ${r[3]} | Loc: ${r[4]} | Link: ${r[6]}`);
});
