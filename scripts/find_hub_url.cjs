async function findHubUrl() {
  const res = await fetch('https://t.me/s/merntech');
  const html = await res.text();
  const urls = [...html.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(m => m[0]);
  const uniqueUrls = [...new Set(urls)];
  console.log('All external URLs in @merntech:');
  uniqueUrls.filter(u => !u.includes('telegram') && !u.includes('t.me') && !u.includes('telesco.pe')).forEach(u => console.log('-', u));
}

findHubUrl();
