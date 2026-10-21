async function check() {
  const urls = [
    'https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_city=Noida',
    'https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer&seeker_search_experience=0',
    'https://www.placementindia.com/job-search/search.php?seeker_search_keyword=React+Developer',
    'https://www.placementindia.com/job-search/react-developer-jobs-in-india.htm'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const text = await res.text();
      const titles = [];
      const tRegex = /<a[^>]*class=["']job-name["'][^>]*><h3>([\s\S]*?)<\/h3><\/a>/g;
      let m;
      while ((m = tRegex.exec(text)) !== null) {
        titles.push(m[1].trim());
      }
      console.log('--- URL:', u, '---');
      console.log('Status:', res.status, 'Titles extracted count:', titles.length);
      console.log('Sample titles:', titles.slice(0, 4));
    } catch (e) {
      console.error(u, e);
    }
  }
}

check();
