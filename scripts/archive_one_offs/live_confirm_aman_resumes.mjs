import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('WhatsApp tab not found');
    await browser.disconnect();
    return;
  }

  // Ensure Aman chat is clicked & focused
  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]'));
    const aman = list.find(it => it.innerText && it.innerText.includes('Aman Techstuff'));
    if (aman) aman.click();
  });
  await sleep(2000);

  // Scroll chat to the absolute bottom
  await wa.evaluate(() => {
    const chatPane = document.querySelector('#main div[tabindex="-1"]') || document.querySelector('#main');
    if (chatPane) chatPane.scrollTop = chatPane.scrollHeight;
  });
  await sleep(1500);

  // Take fresh full screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_live_100pct_confirm.png' });

  // Extract every bubble info in the chat
  const audit = await wa.evaluate(() => {
    const header = document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
    const bubbles = Array.from(document.querySelectorAll('#main div[data-testid="msg-container"], #main div[role="row"]'))
      .map(el => {
        const text = el.innerText?.replace(/\n+/g, ' ');
        const hasPdf = !!el.querySelector('span[data-icon="pdf"], span[data-icon="document-generic"], span[title*=".pdf"]');
        const statusIcon = el.querySelector('span[data-icon="msg-dblcheck"], span[data-icon="msg-check"], span[data-icon="msg-time"]')?.getAttribute('data-icon');
        return { text, hasPdf, statusIcon };
      })
      .filter(b => b.text && (b.text.includes('Resume') || b.text.includes('Dono') || b.text.includes('14:08') || b.text.includes('14:09')));

    return { header, bubbles };
  });

  console.log('AUDIT RESULT:', JSON.stringify(audit, null, 2));
  await browser.disconnect();
}

main().catch(console.error);
