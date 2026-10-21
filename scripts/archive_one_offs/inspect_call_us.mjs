import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/sample_detail.html', 'utf-8');

const callUsMatch = html.match(/call_us[^\n]+/gi);
console.log('call_us match:', callUsMatch);

const recruiterP = html.match(/<[^>]*>(?:Recruiter|Contact Person|HR Exec|HR Manager|Contact Details|Email|Phone)[^<]*<\/[^>]*>[\s\S]{0,300}/gi);
console.log('Recruiter/Contact tag snippets:', recruiterP ? recruiterP.slice(0, 5) : 'none');
