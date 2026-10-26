const fs = require('fs');
let c = fs.readFileSync('scripts/run_rigorous_slot4_audit.cjs', 'utf8');
c = c.replace('console.log(  🚫 DROPPED: Navigation failed ( + navErr.message + ));', 'console.log(`  🚫 DROPPED: Navigation failed (${navErr.message})`);');
fs.writeFileSync('scripts/run_rigorous_slot4_audit.cjs', c, 'utf8');
console.log('Fixed line 165 cleanly');
