import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.log('No WA tab');
    await browser.disconnect();
    return;
  }

  const state = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    const selected = document.querySelector('div[aria-selected="true"]');
    const allChats = Array.from(document.querySelectorAll('#pane-side div[role="listitem"]')).map(el => el.innerText.replace(/\n+/g, ' | '));
    return {
      hasMain: !!main,
      mainHeader: main ? main.querySelector('header')?.innerText?.replace(/\n+/g, ' | ') : null,
      selectedChat: selected ? selected.innerText.replace(/\n+/g, ' | ') : null,
      topChats: allChats.slice(0, 5)
    };
  });

  console.log('WhatsApp State:', JSON.stringify(state, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
