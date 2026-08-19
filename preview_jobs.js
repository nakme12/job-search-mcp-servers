// preview_jobs.js
const fs = require('fs');
const path = require('path');
const DATA_PATH = path.resolve('C:/Users/Dell/AppData/Local/Temp/claude/D--adi-mcp/2359fcc1-b037-4495-a467-e62d6bbd3ddb/scratchpad/final_wide_list.json');
const raw = fs.readFileSync(DATA_PATH,'utf-8');
const jobs = JSON.parse(raw);
const pageSize = 20;
const pageJobs = jobs.slice(0,pageSize);
console.table(pageJobs.map((j,i)=>({
  '#': i+1,
  Title:j.title,
  Company:j.company,
  Location:j.location,
  Remote:j.remote,
  Date:j.date,
  Source:j.src,
  URL:j.url
})));
