async function check() {
  const queries = [
    'React Developer',
    'Frontend Developer',
    'MERN Stack Developer',
    'Full Stack Developer'
  ];

  for (const q of queries) {
    const url = `https://www.placementindia.com/job-search/search.php?seeker_search_keyword=${encodeURIComponent(q)}&filter=date`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const parts = html.split('<div class="sjc-iteam');
    console.log(`Query "${q}" -> Total items returned: ${parts.length - 1}`);
  }
}

check();
