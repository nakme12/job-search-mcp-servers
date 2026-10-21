import fs from "fs";
import path from "path";

const poolFile = path.resolve("scripts/merged_slot2_clean_pool.json");
const jobs = JSON.parse(fs.readFileSync(poolFile, "utf8"));

const categorized = {
  direct_email_ready: [],
  portal_apply_ready: []
};

jobs.forEach(j => {
  if (j.email || j.recipient || /@/.test(j.url)) {
    categorized.direct_email_ready.push(j);
  } else {
    categorized.portal_apply_ready.push(j);
  }
});

console.log(`Direct Email Ready: ${categorized.direct_email_ready.length}`);
console.log(`Portal Form / ATS Apply Ready: ${categorized.portal_apply_ready.length}`);
