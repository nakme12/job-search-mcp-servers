import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  const results = await liPage.evaluate(() => {
    // Find all anchor tags that lead to updates or author profiles
    const anchors = Array.from(document.querySelectorAll('a'));
    const updateAnchors = anchors
      .filter(a => a.href && (a.href.includes('/feed/update/urn:li:activity:') || a.href.includes('/posts/')))
      .map(a => ({ href: a.href, text: a.innerText.trim() }));
    
    // Also find author profile links with timestamps
    const authors = Array.from(document.querySelectorAll('.update-components-actor__container, div[data-chameleon-result-urn]')).map(div => {
      const name = div.querySelector('.update-components-actor__name')?.innerText || '';
      const time = div.querySelector('.update-components-actor__sub-description')?.innerText || '';
      const link = div.querySelector('a')?.href || '';
      const urn = div.getAttribute('data-chameleon-result-urn') || '';
      return { name, time, link, urn };
    });

    return { updateAnchors, authors };
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.disconnect();
}

main();
