import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/freshers_react.html', 'utf-8');
const parts = html.split('<div class="sjc-iteam');

for (let i = 1; i <= 3; i++) {
  console.log(`--- CARD ${i} sjci-need ---`);
  const needMatch = parts[i].match(/<ul[^>]*class=["']sjci-need["'][^>]*>([\s\S]*?)<\/ul>/i);
  if (needMatch) {
    console.log(needMatch[1]);
  }
}
