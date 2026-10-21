import fs from 'fs';

async function parseSample() {
  const res = await fetch('https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_experience=0', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  fs.writeFileSync('C:/mcp/job-search-mcp-engine/scripts/freshers_react.html', html);

  // Let's inspect the cards
  const itemRegex = /<div class=["']sjc-iteam[^"']*["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  // Let's find each sjc-iteam
  const items = html.split('<div class="sjc-iteam');
  console.log('Total items split:', items.length - 1);

  if (items.length > 1) {
    console.log('--- Sample item chunk ---');
    console.log(items[1].substring(0, 2000));
  }
}

parseSample();
