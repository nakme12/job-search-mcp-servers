import { searchPlacementIndia } from '../servers/placementindia-mcp.js';
import fs from 'fs';

(async () => {
  console.log('[PlacementIndia] Initiating fresh search...');
  try {
    const res = await searchPlacementIndia({
      keywords: ["React Developer", "Frontend Developer", "MERN Stack Developer", "Full Stack Developer"],
      cities: ["Delhi", "Noida", "Gurgaon", "Pune", "Ahmedabad", "Bangalore", "Indore", "Surat"],
      maxYearsExperience: 2,
      maxAgeDays: 14, // Allow up to 14 days to harvest fresh openings
      excludeSeniorTitles: true,
      excludeInternships: true,
      targetLocationsOnly: true,
      enrichWithDetailPage: true
    });

    console.log(`\n==============================================================`);
    console.log(`[PlacementIndia Search Results]`);
    console.log(`Total Raw Found: ${res.totalRawFound}`);
    console.log(`Pre-Filtered (0-2 YOE & Location): ${res.preFilteredCount}`);
    console.log(`Final Filtered (Clean Fresh): ${res.finalFilteredCount}`);

    fs.writeFileSync('C:\\mcp\\placementindia_harvested_jobs.json', JSON.stringify(res.jobs, null, 2), 'utf8');

    res.jobs.slice(0, 15).forEach((j, i) => {
      console.log(`\n[Job ${i+1}] ${j.company} — ${j.title}`);
      console.log(`   Location: ${j.location} | Exp: ${j.experience} | Salary: ${j.salary}`);
      console.log(`   URL: ${j.jobUrl}`);
      console.log(`   Contact: ${j.recruiter_contact || 'None'}`);
    });

  } catch (err) {
    console.error('Error during search:', err.message);
  }
})();
