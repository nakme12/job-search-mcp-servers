import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/freshers_react.html', 'utf-8');

// The items split
const parts = html.split('<div class="sjc-iteam');
const rawCards = parts.slice(1);

console.log(`Found ${rawCards.length} raw cards.`);

function clean(str) {
  return (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const jobs = [];

for (const card of rawCards) {
  // Extract URL
  const urlMatch = card.match(/data-url=["']([^"']+)["']/) || card.match(/href=["'](https:\/\/www\.placementindia\.com\/job-detail\/[^"']+)["']/);
  const jobUrl = urlMatch ? urlMatch[1] : null;

  // Extract Title
  const titleMatch = card.match(/<a[^>]*class=["']job-name["'][^>]*><h3>([\s\S]*?)<\/h3><\/a>/i) || card.match(/<h3>([\s\S]*?)<\/h3>/i);
  const title = titleMatch ? clean(titleMatch[1]) : null;

  // Extract Company
  const compMatch = card.match(/<p[^>]*class=["']job-cname["'][^>]*>([\s\S]*?)<\/p>/i);
  const company = compMatch ? clean(compMatch[1]) : null;

  // Extract Experience, Salary, Location from .sjci-need <li> items
  const needMatch = card.match(/<ul[^>]*class=["']sjci-need["'][^>]*>([\s\S]*?)<\/ul>/i);
  let expText = null;
  let salaryText = null;
  let locText = null;

  if (needMatch) {
    const lis = needMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const li of lis) {
      const text = clean(li);
      if (li.includes('icon_exp') || /yrs?|years?|fresher/i.test(text)) {
        expText = text;
      } else if (li.includes('rupee') || /lac|inr|₹/i.test(text)) {
        salaryText = text;
      } else if (li.includes('icon_location') || (!expText && !salaryText)) {
        locText = text;
      }
    }
  }

  // Extract Skills
  const skillsMatch = card.match(/<div[^>]*class=["']sk_list["'][^>]*>([\s\S]*?)<\/div>/i);
  const skills = skillsMatch ? clean(skillsMatch[1]) : null;

  // Extract Summary
  const descMatch = card.match(/<div[^>]*class=["']jobInner["'][^>]*>([\s\S]*?)<\/div>/i);
  const description = descMatch ? clean(descMatch[1]) : null;

  // Look for any emails or phone numbers in description/card
  const emailMatch = card.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  const recruiter_contact = emailMatch ? emailMatch.join(', ') : null;

  jobs.push({
    title,
    company,
    location: locText,
    experience: expText,
    salary: salaryText,
    skills,
    description: description ? description.substring(0, 200) + '...' : null,
    jobUrl,
    recruiter_contact
  });
}

console.log('Sample parsed jobs:');
console.log(JSON.stringify(jobs.slice(0, 5), null, 2));
