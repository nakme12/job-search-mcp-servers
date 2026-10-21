import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Search for pagination or page links
const pageMatches = html.match(/<ul[^>]*class=["'][^"']*page[^"']*["'][\s\S]*?<\/ul>/gi) || html.match(/class=["'][^"']*pagination[^"']*["'][\s\S]*?<\/div>/gi);
console.log('Pagination containers:', pageMatches ? pageMatches.length : 0);
if (pageMatches) {
  console.log(pageMatches[0].substring(0, 500));
}

// Search for links with page= or p= or similar
const pageLinks = html.match(/href=["'][^"']*(?:page|pno|p_no|page_no|start|offset)=\d+[^"']*["']/gi);
console.log('Page links:', pageLinks ? [...new Set(pageLinks)].slice(0, 10) : 'none');
