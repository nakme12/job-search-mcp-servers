/**
 * audit_and_purge_file4.cjs
 * Hard Automated Secondary Gatekeeper for File 4
 * Automatically invoked before any batch is finalized in File 4.
 * Prevents MISTAKE-41 (Superficial Subagent Trust).
 */
const fs = require('fs');
const path = require('path');

function purgeFile4(dateStr = '2026-10-21') {
  const file4Path = path.join('C:/mcp/job-search-mcp-engine', `verified_todays_${dateStr}.json`);
  if (!fs.existsSync(file4Path)) return;

  const raw = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
  const jobs = Array.isArray(raw) ? raw : (raw.jobs || []);

  const bannedLocations = ['bucharest', 'dublin', 'barcelona', 'romania', 'ireland', 'spain', 'germany', 'brazil', 'malaysia', 'pakistan'];
  const bannedKeywords = [
    'us citizen', 'us citizenship', 'security clearance', 'government clearance',
    'staff', 'principal', 'lead', 'architect', 'phd', 'summer 2027', 'summer 2026 intern',
    'database', 'disaster recovery', 'vulnerability', 'infrastructure', 'wordpress', 'shopify', 'c++'
  ];

  const cleaned = jobs.filter(j => {
    const text = `${j.company || ''} ${j.role || ''} ${j.location || ''} ${j.description || ''}`.toLowerCase();
    
    // Check banned locations
    for (const loc of bannedLocations) {
      if ((j.location || '').toLowerCase().includes(loc)) {
        console.log(`[PURGE] Dropped ${j.company} - ${j.role}: Banned Location (${loc})`);
        return false;
      }
    }

    // Check banned keywords
    for (const kw of bannedKeywords) {
      if (text.includes(kw)) {
        console.log(`[PURGE] Dropped ${j.company} - ${j.role}: Disqualifying keyword (${kw})`);
        return false;
      }
    }

    return true;
  });

  const updated = {
    date: dateStr,
    shift: 1,
    cycle: 1,
    description: 'Deeply re-verified live DOM jobs (Automated Secondary Guard Protected)',
    total: cleaned.length,
    jobs: cleaned
  };

  fs.writeFileSync(file4Path, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`✅ Automated Secondary Gatekeeper: Retained ${cleaned.length} / ${jobs.length} jobs.`);
}

if (require.main === module) {
  purgeFile4(process.argv[2] || '2026-10-21');
}

module.exports = { purgeFile4 };
