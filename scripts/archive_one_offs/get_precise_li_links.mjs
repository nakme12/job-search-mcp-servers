import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  const data = await liPage.evaluate(() => {
    const list = [];
    const elements = Array.from(document.querySelectorAll('div, li, section'));
    for (const el of elements) {
      if (el.innerText && el.innerText.startsWith('Feed post\n') && el.innerText.length > 80 && el.innerText.length < 3500) {
        // Find anchor tags with post or update link
        const aTags = Array.from(el.querySelectorAll('a'));
        let postLink = '';
        for (const a of aTags) {
          if (a.href.includes('/feed/update/urn:li:activity:') || a.href.includes('/posts/')) {
            postLink = a.href;
            break;
          }
        }
        
        // Find author
        const authorLink = aTags.find(a => a.href.includes('linkedin.com/in/'))?.href || '';
        
        // Extract timestamp indicator (e.g. 5m, 13m, 1h, now)
        const timeMatch = el.innerText.match(/\n([0-9]+[mhd]|now)\n/i);
        const timeStr = timeMatch ? timeMatch[1] : 'recent (past 24h)';

        list.push({
          postLink,
          authorLink,
          timeStr,
          text: el.innerText.slice(0, 300).replace(/\n+/g, ' | ')
        });
      }
    }
    return list;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.disconnect();
}

main();
