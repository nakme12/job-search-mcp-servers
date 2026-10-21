async function check() {
  const urls = [
    'https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&filter=date',
    'https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_experience=0&filter=date',
    'https://www.placementindia.com/job-search/search.php?seeker_search_keyword=Frontend+Developer&filter=date'
  ];

  for (const u of urls) {
    const res = await fetch(u, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const count = (html.match(/class=["']job-name["']/g) || []).length;
    console.log(u, '-> job names count:', count);
  }
}
check();
