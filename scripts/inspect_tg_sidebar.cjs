const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  const info = await tgPage.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
      id: i.id,
      placeholder: i.placeholder,
      className: i.className
    }));

    // Find all chat titles in left column
    const titleElements = Array.from(document.querySelectorAll('.ListItem .title, h3, .user-title, [class*="peer-title"]'));
    const titles = titleElements.map(e => e.innerText?.trim()).filter(Boolean);

    return { inputs, titles: titles.slice(0, 20) };
  });

  console.log('=== TG WEB A INPUTS ===');
  console.log(JSON.stringify(info.inputs, null, 2));

  console.log('\n=== TG WEB A CHAT/CHANNEL TITLES IN SIDEBAR ===');
  console.log(JSON.stringify(info.titles, null, 2));

  await browser.disconnect();
})().catch(e => console.error('Error:', e.message));
