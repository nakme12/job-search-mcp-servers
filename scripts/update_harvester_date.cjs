const fs = require('fs');
let c = fs.readFileSync('scripts/zero_adzuna_direct_ats_harvester.mjs', 'utf8');
c = c.replace('const TODAY = "2026-10-21";', 'const TODAY = process.argv[2] || "2026-10-25";');
c = c.replace('const SHIFT = 2;', 'const SHIFT = 1;');
fs.writeFileSync('scripts/zero_adzuna_direct_ats_harvester.mjs', c, 'utf8');
console.log('Updated zero_adzuna_direct_ats_harvester.mjs date successfully');
