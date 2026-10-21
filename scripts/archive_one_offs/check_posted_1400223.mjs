async function test() {
  const u1 = 'https://www.placementindia.com/job-detail/react-developer-in-talent-zone-consultant-at-bangalore-1400223.htm';
  const res = await fetch(u1, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const idx = html.indexOf('job_posting_slno');
  console.log(html.substring(idx - 100, idx + 200));

  // Find if there is any posted date text in html
  const regex = /(?:posted|date|day|ago|time)[\s\S]{0,50}/gi;
  // Let's search for "Posted" case sensitive
  const matches = [];
  let pIdx = 0;
  while ((pIdx = html.indexOf('Posted', pIdx)) !== -1) {
    matches.push(html.substring(pIdx - 20, pIdx + 80).replace(/\s+/g, ' '));
    pIdx += 6;
  }
  console.log('Matches for Posted:', matches);
}
test();
