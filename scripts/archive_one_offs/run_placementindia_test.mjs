import fs from 'fs';
import { searchPlacementIndia } from '../servers/placementindia-mcp.js';

async function main() {
  console.log('Starting PlacementIndia search test...');
  const startTime = Date.now();

  const results = await searchPlacementIndia({
    keywords: ['React Developer', 'Frontend Developer', 'MERN Stack Developer', 'Full Stack Developer'],
    cities: ['Delhi', 'Noida', 'Pune', 'Ahmedabad', 'Bangalore', 'Indore', 'Surat'],
    maxYearsExperience: 2,
    maxAgeDays: 7,
    excludeSeniorTitles: true,
    excludeInternships: true,
    targetLocationsOnly: true,
    enrichWithDetailPage: true
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Search completed in ${durationSec}s`);
  console.log(`Total raw jobs found: ${results.totalRawFound}`);
  console.log(`Pre-filtered jobs: ${results.preFilteredCount}`);
  console.log(`Final filtered jobs (0-2 YOE, Target Cities/WFH, <=7 days): ${results.finalFilteredCount}`);

  const outputPath = 'C:/mcp/job-search-mcp-engine/scripts/placementindia_mcp_results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${outputPath}`);

  console.log('\n--- Summary of Jobs Found ---');
  results.jobs.forEach((j, i) => {
    console.log(`${i + 1}. [${j.title}] @ ${j.company}`);
    console.log(`   Location: ${j.location} | Exp: ${j.experience} | Posted: ${j.postedDate || 'N/A'}`);
    console.log(`   URL: ${j.jobUrl}`);
    if (j.recruiter_contact) console.log(`   Contact: ${j.recruiter_contact}`);
    console.log('');
  });
}

main().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
