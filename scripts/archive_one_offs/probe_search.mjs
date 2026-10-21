import fs from 'fs';

async function run() {
  const res = await fetch('https://www.placementindia.com/job-search/search.php?keyword=React+Developer', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/scripts/full_placementindia.html', html);
  console.log('Saved full html, length:', html.length);

  // find script tags or JSON-LD
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLd) {
    console.log('Found JSON-LD scripts:', jsonLd.length);
    jsonLd.forEach((s, idx) => {
      console.log(`JSON-LD [${idx}]:`, s.substring(0, 300));
    });
  } else {
    console.log('No JSON-LD found');
  }

  // Find job title links: search for href containing /job- or job detail links
  const links = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (href.includes('-jobs-') || href.includes('job-detail') || href.includes('/jobs/') || href.includes('-job-') || href.includes('.htm')) {
      if (text.length > 5 && (text.toLowerCase().includes('react') || text.toLowerCase().includes('developer') || text.toLowerCase().includes('engineer'))) {
        links.push({ href, text });
      }
    }
  }
  console.log('Matching job links count:', links.length);
  console.log('Sample links:', links.slice(0, 10));
}

run().catch(console.error);
