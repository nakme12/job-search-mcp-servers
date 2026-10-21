import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/sample_detail.html', 'utf-8');

// Look for recruiter or company or contact blocks
const keywords = ['recruiter', 'contact', 'company overview', 'about company', 'job overview', 'posted by', 'email', 'mobile'];
keywords.forEach(kw => {
  let idx = 0;
  while ((idx = html.toLowerCase().indexOf(kw, idx)) !== -1) {
    const chunk = html.substring(Math.max(0, idx - 50), Math.min(html.length, idx + 200)).replace(/\s+/g, ' ');
    console.log(`[${kw}]: ${chunk}`);
    idx += kw.length + 50;
    if (idx > 500000) break;
  }
});
