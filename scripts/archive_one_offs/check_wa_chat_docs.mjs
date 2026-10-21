import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const status = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    if (!main) return { error: 'No #main' };
    
    // Check if there are document attachments in chat
    const docIcons = Array.from(main.querySelectorAll('span[data-icon="document-generic"], span[data-icon="pdf"], span[data-icon="msg-pdf"], div[title*=".pdf"], span[title*=".pdf"]'));
    const docTexts = docIcons.map(d => d.closest('[role="row"], [data-testid="msg-container"]')?.innerText?.replace(/\n+/g, ' '));
    
    // Also get all outgoing message status icons (clock, single check, double check)
    const outMsgs = Array.from(main.querySelectorAll('span[data-icon="msg-time"], span[data-icon="msg-check"], span[data-icon="msg-dblcheck"]')).map(s => s.getAttribute('data-icon'));

    return {
      docCount: docIcons.length,
      docTexts,
      outMsgs
    };
  });

  console.log('Chat attachment status:', JSON.stringify(status, null, 2));
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_final_confirmed_chat.png' });
  console.log('Saved screenshots/2026-10-12/wa_aman_final_confirmed_chat.png');

  await browser.disconnect();
}

main().catch(console.error);
