async function test() {
  const u1 = 'https://www.placementindia.com/job-detail/react-developer-in-talent-zone-consultant-at-bangalore-1400223.htm';
  const res = await fetch(u1, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  console.log('ldMatches length:', ldMatches ? ldMatches.length : 0);
  if (ldMatches) {
    ldMatches.forEach((m, idx) => {
      console.log(`ldMatch [${idx}]: length ${m.length}`);
      const jsonText = m.replace(/<script type="application\/ld\+json">|<\/script>/gi, "").trim();
      try {
        const parsed = JSON.parse(jsonText);
        console.log(`parsed [${idx}]: @type = ${parsed['@type']}, keys: ${Object.keys(parsed).join(', ')}`);
      } catch (e) {
        console.log(`parsed [${idx}] error:`, e.message);
      }
    });
  }
}
test();
