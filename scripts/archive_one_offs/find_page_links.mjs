import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Find next or page
const nextMatches = html.match(/<a[^>]*>(?:Next|Next Page|&raquo;|>|Previous|Prev|2|3)<\/a>/gi);
console.log('Next matches:', nextMatches);

// Check bottom of #jobs_results
const resultsIdx = html.indexOf('id="jobs_results"');
if (resultsIdx !== -1) {
  const closeIdx = html.indexOf('</div>', resultsIdx);
  // find after all cards
  const lastCard = html.lastIndexOf('<div class="sjc-iteam');
  console.log('After last card:');
  console.log(html.substring(lastCard + 500, lastCard + 2500));
}
