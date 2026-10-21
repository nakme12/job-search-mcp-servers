const fs = require('fs');

function parseClaudeCsv() {
  const lines = fs.readFileSync('archive_old_scripts/claude_findings_react_mern_jobs_2026-10-13.csv', 'utf8').split('\n');
  const list = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),(.*)$/);
    if (match) {
      list.push({
        tier: match[1].trim(),
        status: match[2].trim(),
        company: match[3].trim(),
        role: match[4].trim(),
        location: match[5].trim(),
        posted: match[6].trim(),
        url: match[7].trim(),
        notes: match[8].trim().replace(/^"|"$/g, '')
      });
    }
  }

  fs.writeFileSync('claude_extracted_unverified_pool.json', JSON.stringify(list, null, 2));
  console.log('Successfully structured ' + list.length + ' jobs into claude_extracted_unverified_pool.json');
}

parseClaudeCsv();
