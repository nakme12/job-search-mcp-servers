import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Print first 1500 chars of refineForm
const refineIdx = html.indexOf('id="refineForm"');
if (refineIdx !== -1) {
  console.log('--- refineForm ---');
  console.log(html.substring(refineIdx, refineIdx + 2000));
}

// Print seeker_search form
const seekerIdx = html.indexOf('id="seeker_search"');
if (seekerIdx !== -1) {
  console.log('--- seeker_search form ---');
  console.log(html.substring(seekerIdx, seekerIdx + 1500));
}
