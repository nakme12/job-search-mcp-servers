import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/freshers_react.html', 'utf-8');
const items = html.split('<div class="sjc-iteam');

if (items.length > 1) {
  console.log('--- Remainder of item 1 ---');
  console.log(items[1].substring(1000, 3000));
}
