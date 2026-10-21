async function testRecentIds() {
  const ids = [1468041, 1467994, 1467991, 1467115, 1466863, 1466500, 1465000, 1460000, 1450000];
  for (const id of ids) {
    // find a job detail or test one
    // Let's test the known URLs
  }
  // Let's inspect 5 jobs from the results that had high IDs
  const known = [
    'https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm',
    'https://www.placementindia.com/job-detail/front-end-developer-in-sera-social-dating-at-bhopal-1466863.htm',
    'https://www.placementindia.com/job-detail/back-end-developer-in-jobassist-at-mumbai-1466500.htm',
    'https://www.placementindia.com/job-detail/mobile-application-developer-in-navira-herb-house-private-limited-at-pratap-nagar-jaipur-1461948.htm'
  ];

  for (const u of known) {
    const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    let date = null;
    if (ldMatch) {
      for (const m of ldMatch) {
        if (m.includes('JobPosting')) {
          const parsed = JSON.parse(m.replace(/<script type="application\/ld\+json">|<\/script>/gi, '').trim());
          date = parsed.datePosted;
        }
      }
    }
    const relMatch = html.match(/Posted\s+[^<]+/i);
    console.log(u);
    console.log('JSON-LD date:', date, '| Relative match:', relMatch ? relMatch[0] : 'None');
  }
}

testRecentIds();
