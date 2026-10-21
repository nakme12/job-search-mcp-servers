async function checkPosted() {
  const url = 'https://www.placementindia.com/job-detail/react-developer-in-talent-zone-consultant-at-bangalore-1400223.htm';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();

  const postedIdx = html.indexOf('postedon');
  if (postedIdx !== -1) {
    console.log('Snippet around postedon:');
    console.log(html.substring(postedIdx - 50, postedIdx + 300));
  }

  // Also look for jd-mfl
  const jdmflIdx = html.indexOf('jd-mfl');
  if (jdmflIdx !== -1) {
    console.log('Snippet around jd-mfl:');
    console.log(html.substring(jdmflIdx - 50, jdmflIdx + 400));
  }

  // Also look for JSON-LD JobPosting
  const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  console.log('LD matches count:', ldMatches ? ldMatches.length : 0);
  if (ldMatches) {
    ldMatches.forEach((m, i) => console.log(`LD [${i}]:`, m.substring(0, 150)));
  }
}

checkPosted();
