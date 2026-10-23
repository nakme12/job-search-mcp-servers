const puppeteer = require('puppeteer-core');

async function searchIndoreBangaloreCareers() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const query = encodeURIComponent('inurl:career "React Developer" OR "Frontend Developer" "Indore" OR "Remote"');
  await page.goto('https://www.google.com/search?q=' + query, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));
  
  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ title: a.innerText.trim(), href: a.href }))
      .filter(x => x.href.startsWith('http') && 
                   !x.href.includes('google.com') && 
                   !x.href.includes('naukri.com') && 
                   !x.href.includes('linkedin.com') && 
                   !x.href.includes('indeed.com') && 
                   !x.href.includes('glassdoor.com') && 
                   !x.href.includes('cutshort.io') && 
                   !x.href.includes('shine.com') && 
                   x.title.length > 5)
      .slice(0, 15);
  });
  console.log('Search results:\n', JSON.stringify(results, null, 2));
  await page.close();
  await browser.disconnect();
}
searchIndoreBangaloreCareers().catch(console.error);
