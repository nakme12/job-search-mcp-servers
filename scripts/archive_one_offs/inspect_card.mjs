import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Search for job-detail links
const detailMatches = html.match(/https:\/\/www\.placementindia\.com\/job-detail\/[^\s"'<>]+/gi) || [];
console.log('Total job-detail links:', detailMatches.length);
console.log('Unique job-detail links:', [...new Set(detailMatches)].length);

// Let's inspect the HTML chunk around the first job-detail link
if (detailMatches.length > 0) {
  const firstUrl = detailMatches[0];
  const idx = html.indexOf(firstUrl);
  console.log('--- Context around first job link ---');
  console.log(html.substring(Math.max(0, idx - 400), Math.min(html.length, idx + 1000)));
}
