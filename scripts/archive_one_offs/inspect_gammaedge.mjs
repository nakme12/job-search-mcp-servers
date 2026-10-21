async function checkGammaEdge() {
  try {
    const res = await fetch('https://gammaedge.io/careers');
    const html = await res.text();
    const emails = [...new Set(html.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/g) || [])];
    console.log('Emails:', emails);

    // Look for application link or API endpoints
    const apiMatches = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
    const relevantLinks = apiMatches.filter(l => l.includes('careers') || l.includes('jobs') || l.includes('forms') || l.includes('notion') || l.includes('apply'));
    console.log('Relevant apply links:', [...new Set(relevantLinks)]);
  } catch (e) {
    console.error(e.message);
  }
}

checkGammaEdge();
