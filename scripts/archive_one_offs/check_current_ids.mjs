import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/placementindia_mcp_results.json', 'utf-8'));
console.log('Total jobs:', data.jobs.length);

const ids = data.jobs.map(j => {
  const m = j.jobUrl.match(/-(\d+)\.htm/);
  return m ? parseInt(m[1], 10) : 0;
});

console.log('Max ID:', Math.max(...ids));
console.log('Min ID:', Math.min(...ids));
console.log('IDs > 1466000:', ids.filter(id => id >= 1466000).length);
console.log('IDs > 1460000:', ids.filter(id => id >= 1460000).length);
console.log('IDs < 1400000:', ids.filter(id => id < 1400000).length);
console.log('IDs < 1100000:', ids.filter(id => id < 1100000).length);
