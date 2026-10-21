import fs from 'fs';
import path from 'path';

const dir = 'C:/mcp/job-search-mcp-engine/servers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const toolMatches = [...content.matchAll(/registerTool\(\s*["']([^"']+)["']/g)].map(m => m[1]);
  const urlMatches = (content.match(/https?:\/\/[a-zA-Z0-9.\-_/]+/g) || []).slice(0, 3);
  console.log(`FILE: ${f}\n  TOOLS: ${toolMatches.join(', ')}\n  URLS: ${urlMatches.join(', ')}\n`);
}
