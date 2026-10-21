const fs = require('fs');

const applied = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json', 'utf8')).jobs || [];
const appliedUrls = new Set(applied.map(j => (j.recipient_or_url || j.url || '').toLowerCase().trim()));

const hist = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/total_historical_except_today.json', 'utf8'));
const histList = Array.isArray(hist) ? hist : (hist.jobs || hist.applied || []);
const histUrls = new Set(histList.map(j => (j.recipient_or_url || j.url || '').toLowerCase().trim()));

function getCandidates(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const jobs = Array.isArray(raw) ? raw : (raw.jobs || []);
  return jobs;
}

const vToday = getCandidates('C:/mcp/job-search-mcp-engine/verified_todays_2026-10-14.json');
const tToday = getCandidates('C:/mcp/job-search-mcp-engine/total_todays_2026-10-14.json');
const staged = getCandidates('C:/mcp/job-search-mcp-engine/data/tomorrow_staged_jobs_2026-10-14.json');

console.log('Total verified today:', vToday.length);
console.log('Total todays:', tToday.length);
console.log('Total staged:', staged.length);

const all = [...vToday, ...tToday, ...staged];
const portalCandidates = [];
const seenUrls = new Set();

for (const j of all) {
  const url = (j.url || j.verifiedApplyHref || j.recipient_or_url || '').toLowerCase().trim();
  if (!url || !url.startsWith('http')) continue;
  if (url.includes('mailto:')) continue;
  if (appliedUrls.has(url) || histUrls.has(url) || seenUrls.has(url)) continue;
  seenUrls.add(url);
  portalCandidates.push(j);
}

console.log('Fresh unapplied portal candidates count:', portalCandidates.length);
for (let i = 0; i < Math.min(30, portalCandidates.length); i++) {
  const j = portalCandidates[i];
  console.log((i + 1) + '. [' + (j.company || 'Unknown') + '] ' + (j.role || 'Role') + ' -> ' + (j.url || j.verifiedApplyHref));
}
