import fs from 'fs';

async function checkDetail() {
  const url = 'https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  console.log('Detail page status:', res.status, 'HTML length:', html.length);
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/scripts/sample_detail.html', html);

  // Check JSON-LD
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLd) {
    console.log('Found JSON-LD scripts on detail page:', jsonLd.length);
    jsonLd.forEach((s, idx) => {
      console.log(`JSON-LD [${idx}]:\n`, s.substring(0, 1000));
    });
  }

  // Check posted date, email, phone, recruiter
  const dateMatch = html.match(/(posted|datePosted|posted on)[\s\S]{0,100}/gi);
  console.log('Date matches:', dateMatch ? dateMatch.slice(0, 5) : 'none');

  // Check email
  const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  console.log('Emails found:', emails ? [...new Set(emails)] : 'none');

  // Check recruiter / contact section
  const contactIdx = html.search(/recruiter|contact person|company profile|about company/i);
  if (contactIdx !== -1) {
    console.log('Contact snippet:', html.substring(contactIdx, contactIdx + 600));
  }
}

checkDetail();
