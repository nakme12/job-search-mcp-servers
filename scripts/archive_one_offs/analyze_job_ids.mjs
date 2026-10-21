import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Find all job IDs from URLs in the search results
const idMatches = html.match(/-(\d{7})\.htm/g) || [];
const ids = idMatches.map(m => parseInt(m.replace(/[-.htm]/g, ''), 10));
console.log('Total job IDs found on search page:', ids.length);
if (ids.length > 0) {
  console.log('Max ID:', Math.max(...ids));
  console.log('Min ID:', Math.min(...ids));
  console.log('First 10 IDs in order:');
  console.log(ids.slice(0, 10));
}
