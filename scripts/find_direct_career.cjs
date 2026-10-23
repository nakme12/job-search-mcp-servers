const puppeteer = require('puppeteer-core');

async function searchDirectCareerPages() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const query = encodeURIComponent('inurl:careers "Frontend Developer" OR "React Developer" "Indore" OR "Bangalore" OR "Remote"');
  await page.goto('https://www.google.com/search?q=' + query, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ title: a.innerText.trim(), href: a.href }))
      .filter(x => x.href.startsWith('http') && 
                   !x.href.includes('google.com') && 
                   !x.href.includes('naukri.com') && 
                   !x.href.includes('linkedin.com') && 
                   !x.href.includes('indeed.com') &&
                   x.title.length > 5)
      .slice(0, 15);
  });
  console.log('Direct career links found:\n', JSON.stringify(links, null, 2));
  await page.close();
  await browser.disconnect();
}
searchDirectCareerPages().catch(console.error);
