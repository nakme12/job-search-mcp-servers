import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', 'utf-8');

// Find the first full .sjc-iteam container
const start = html.indexOf('<div class="sjc-iteam');
if (start !== -1) {
  const nextItem = html.indexOf('<div class="sjc-iteam', start + 20);
  console.log('--- One full job card ---');
  console.log(html.substring(start, nextItem !== -1 ? nextItem : start + 3000));
}

// Also check form action or search inputs
const formMatch = html.match(/<form[^>]*action=["']([^"']*)["'][^>]*>([\s\S]*?)<\/form>/gi);
console.log('--- Forms ---');
if (formMatch) {
  formMatch.slice(0, 3).forEach(f => console.log(f.substring(0, 300)));
}
