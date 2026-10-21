const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json', 'utf8'));

console.log('Total logged applications:', data.jobs.length);
let count = 0;

data.jobs.forEach((j, i) => {
  const proofs = j.proof_screenshots || [];
  const valid = proofs.filter(p => {
    return fs.existsSync(p) || fs.existsSync(path.resolve('C:/mcp/job-search-mcp-engine', p));
  });

  const fullPaths = valid.map(p => {
    if (fs.existsSync(p)) return path.resolve(p);
    return path.resolve('C:/mcp/job-search-mcp-engine', p);
  });

  console.log(`\n#${i + 1} Company: ${j.company} | Role: ${j.role} | Channel: ${j.channel}`);
  console.log(`   Proofs Saved on Disk (${valid.length}/${proofs.length}):`);
  fullPaths.forEach(fp => console.log(`   - file:///${fp.replace(/\\/g, '/')}`));
  if (valid.length > 0) count++;
});

console.log(`\n======================================================`);
console.log(`VERIFICATION SUMMARY: ${count} / ${data.jobs.length} applications have verified screenshots on disk!`);
