const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));

  if (!liPage) { console.log('NO_LINKEDIN_TAB'); await browser.disconnect(); return; }

  // Go to messaging if not already there
  if (!liPage.url().includes('/messaging')) {
    await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('Looking for Aniket Kshirsagar thread...');

  // Click on Aniket's thread
  const clicked = await liPage.evaluate(() => {
    const threads = document.querySelectorAll('.msg-conversation-listitem');
    for (const el of threads) {
      const name = el.querySelector('.msg-conversation-listitem__participant-names')?.innerText?.trim() || '';
      if (name.toLowerCase().includes('aniket')) {
        el.click();
        return name;
      }
    }
    return null;
  });

  if (!clicked) {
    console.log('❌ Could not find Aniket thread. Trying search...');
    await browser.disconnect();
    return;
  }

  console.log(`✅ Clicked thread: ${clicked}`);
  await new Promise(r => setTimeout(r, 2500));

  // Type the reply message
  const replyText = "Thanks for the reply, Aniket! No worries at all. Please do keep me in mind if any frontend/React openings come up in the future 🙏";

  const typed = await liPage.evaluate((msg) => {
    const msgBox = document.querySelector('.msg-form__contenteditable[contenteditable="true"], div[role="textbox"][contenteditable="true"]');
    if (!msgBox) return false;
    msgBox.focus();
    msgBox.innerText = msg;
    msgBox.dispatchEvent(new Event('input', { bubbles: true }));
    msgBox.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, replyText);

  if (!typed) {
    console.log('❌ Could not find message input box');
    await browser.disconnect();
    return;
  }

  console.log('✅ Message typed:', replyText);
  await new Promise(r => setTimeout(r, 1500));

  // Click send button
  const sent = await liPage.evaluate(() => {
    const sendBtn = document.querySelector('.msg-form__send-button, button[type="submit"][aria-label*="Send"], button.msg-form__send-toggle');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      return true;
    }
    // Try Enter key approach
    const msgBox = document.querySelector('.msg-form__contenteditable[contenteditable="true"]');
    if (msgBox) {
      msgBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      return 'enter';
    }
    return false;
  });

  console.log('Send result:', sent);
  await new Promise(r => setTimeout(r, 2000));

  // Verify sent
  const lastMsg = await liPage.evaluate(() => {
    const msgs = document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem');
    const last = msgs[msgs.length - 1];
    return last?.innerText?.trim()?.substring(0, 150) || 'Not found';
  });

  console.log('\n✅ Last message in thread:', lastMsg);
  console.log('\n🎉 Reply to Aniket DONE!');

  await browser.disconnect();
})().catch(e => console.error('ERROR:', e.message));
