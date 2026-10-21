async function testCity() {
  const cities = ['Noida', 'Delhi', 'Pune', 'Ahmedabad', 'Bangalore', 'Indore', 'Surat'];
  for (const c of cities) {
    const url = `https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_city=${encodeURIComponent(c)}&filter=date`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const parts = html.split('<div class="sjc-iteam');
    console.log(`City: ${c} -> Found: ${parts.length - 1} items`);
  }
}

testCity();
