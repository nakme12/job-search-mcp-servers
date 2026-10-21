import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/sample_detail.html', 'utf-8');

// Parse JSON-LD [1]
const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
if (jsonLdMatch && jsonLdMatch[1]) {
  const content = jsonLdMatch[1].replace(/<script type="application\/ld\+json">|<\/script>/gi, '').trim();
  const parsed = JSON.parse(content);
  console.log('Parsed JobPosting JSON-LD keys:', Object.keys(parsed));
  console.log('title:', parsed.title);
  console.log('datePosted:', parsed.datePosted);
  console.log('hiringOrganization:', parsed.hiringOrganization);
  console.log('jobLocation:', JSON.stringify(parsed.jobLocation));
  console.log('experienceRequirements:', parsed.experienceRequirements);
}

// Let's also check recruiter info on the detail page
const recruiterMatch = html.match(/class=["'][^"']*recruiter[^"']*["'][\s\S]{0,500}/gi);
console.log('recruiter class match:', recruiterMatch ? recruiterMatch.slice(0, 3) : 'none');

// Look for contact person or email or phone
const phoneMatch = html.match(/(?:call|phone|mobile|contact)[\s\S]{0,100}\d{10}/gi);
console.log('phone match:', phoneMatch ? phoneMatch.slice(0, 3) : 'none');
