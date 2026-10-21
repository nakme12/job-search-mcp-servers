import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Search for validate_search_job in the HTML
const fnIdx = html.indexOf('validate_search_job');
if (fnIdx !== -1) {
  console.log('--- validate_search_job context ---');
  console.log(html.substring(fnIdx, fnIdx + 1000));
} else {
  console.log('validate_search_job not found directly in HTML');
}

// Search for scripts loaded
const scripts = html.match(/<script[^>]*src=["']([^"']*)["'][^>]*>/gi) || [];
console.log('External scripts:', scripts.slice(0, 15));
