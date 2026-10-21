import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  const threads = await liPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card'));
    return list.map(item => {
      const a = item.querySelector('a');
      const text = item.innerText.replace(/\n+/g, ' | ');
      return {
        href: a ? a.href : null,
        text: text.slice(0, 150)
      };
    });
  });

  console.log('Threads:', JSON.stringify(threads, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
