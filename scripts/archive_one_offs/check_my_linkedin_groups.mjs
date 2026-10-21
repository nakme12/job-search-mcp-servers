import puppeteer from 'puppeteer-core';

async function checkGroups() {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  await p.goto('https://www.linkedin.com/groups/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4500));
  const groups = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      title: a.innerText.trim().replace(/\n+/g, ' '),
      url: a.href.split('?')[0]
    })).filter(g => g.url.includes('/groups/') && g.title.length > 3 && !g.title.includes('Groups'));
  });
  console.log('Joined Groups Count:', groups.length);
  groups.forEach((g, i) => console.log(`${i+1}. ${g.title} -> ${g.url}`));
  await p.close();
  b.disconnect();
}

checkGroups().catch(console.error);
