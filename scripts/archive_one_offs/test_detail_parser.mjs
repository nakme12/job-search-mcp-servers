import fs from 'fs';

async function testFetchDetail() {
  const testUrls = [
    'https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm',
    'https://www.placementindia.com/job-detail/front-end-developer-in-sera-social-dating-at-bhopal-1466863.htm'
  ];

  for (const u of testUrls) {
    const res = await fetch(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    let jobPosting = null;
    if (ldMatch) {
      for (const m of ldMatch) {
        const jsonText = m.replace(/<script type="application\/ld\+json">|<\/script>/gi, '').trim();
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed['@type'] === 'JobPosting') {
            jobPosting = parsed;
            break;
          }
        } catch (e) {}
      }
    }
    console.log('URL:', u);
    if (jobPosting) {
      console.log('JobPosting found:');
      console.log('Title:', jobPosting.title);
      console.log('datePosted:', jobPosting.datePosted);
      console.log('experienceRequirements:', jobPosting.experienceRequirements);
      console.log('jobLocation:', jobPosting.jobLocation);
    } else {
      console.log('No JobPosting found. Raw posted matches:');
      const pm = html.match(/Posted\s+[^<]+/i);
      console.log(pm ? pm[0] : 'None');
    }
  }
}

testFetchDetail();
