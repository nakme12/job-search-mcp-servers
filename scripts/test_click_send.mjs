import puppeteer from 'puppeteer';

async function testClickSend() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  
  await gmailPage.bringToFront();
  
  // Find the Send button or use Ctrl+Enter
  console.log('Attempting to click Send button via JS click...');
  const sendClicked = await gmailPage.evaluate(() => {
    // Find all elements with text 'Send' or role button with Send
    const dialog = document.querySelector('div[role="dialog"], div.M9, div.AD');
    if (!dialog) return { success: false, reason: 'no dialog' };
    
    // Look for send button inside dialog
    const sendButtons = Array.from(dialog.querySelectorAll('div[role="button"], button')).filter(b => {
      const label = (b.getAttribute('aria-label') || b.getAttribute('data-tooltip') || b.innerText || '').toLowerCase();
      return label.includes('send') && !label.includes('scheduled');
    });
    
    if (sendButtons.length > 0) {
      sendButtons[0].click();
      return { success: true, text: sendButtons[0].innerText || sendButtons[0].getAttribute('aria-label') };
    }
    return { success: false, reason: 'no send button found' };
  });

  console.log('Send clicked result:', sendClicked);
  
  await new Promise(r => setTimeout(r, 4000));
  
  // Check if sent message appears in Sent folder
  const sentRows = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]'));
    return rows.slice(0, 3).map(r => {
      const recipient = r.querySelector('.yX, .zF, .bA4')?.innerText?.trim() || '';
      const subject = r.querySelector('.bog, .y6')?.innerText?.trim() || '';
      const date = r.querySelector('.xW, .bq9')?.innerText?.trim() || '';
      return { recipient, subject, date };
    });
  });
  console.log('Top sent rows:', sentRows);
  
  browser.disconnect();
}

testClickSend().catch(console.error);
