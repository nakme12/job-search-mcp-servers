async function test() {
  const u1 = 'https://www.placementindia.com/job-detail/react-developer-in-talent-zone-consultant-at-bangalore-1400223.htm';
  const res = await fetch(u1, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const text = await res.text();
  console.log('Includes JobPosting:', text.includes('JobPosting'));
  console.log('Includes application/ld+json:', text.includes('application/ld+json'));
  const scripts = text.match(/<script[^>]*type=["']([^"']+)["'][^>]*>/gi);
  console.log('Scripts with type:', scripts);
}
test();
