const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));

  if (!liPage) { console.log('NO_LINKEDIN_TAB'); await browser.disconnect(); return; }

  await new Promise(r => setTimeout(r, 1000));

  // Debug: find all buttons and input areas
  const debug = await liPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText?.trim()?.substring(0, 40),
      aria: b.getAttribute('aria-label'),
      disabled: b.disabled,
      class: b.className?.substring(0, 60)
    })).filter(b => b.text || b.aria);

    const inputs = Array.from(document.querySelectorAll('[contenteditable="true"]')).map(el => ({
      tag: el.tagName,
      text: el.innerText?.trim()?.substring(0, 80),
      class: el.className?.substring(0, 60)
    }));

    return { btns: btns.slice(0, 20), inputs };
  });

  console.log('=== BUTTONS ===');
  debug.btns.forEach((b, i) => console.log(`[${i}] text="${b.text}" aria="${b.aria}" disabled=${b.disabled}`));
  console.log('\n=== CONTENTEDITABLE AREAS ===');
  debug.inputs.forEach((inp, i) => console.log(`[${i}] tag=${inp.tag} text="${inp.text}" class="${inp.class}"`));

  // Now type and send properly using keyboard
  const replyText = "Thanks for the reply, Aniket! No worries at all. Please do keep me in mind if any frontend/React openings come up in the future 🙏";

  // Find the message box and click it
  const msgBox = await liPage.$('.msg-form__contenteditable[contenteditable="true"]');
  if (!msgBox) {
    console.log('❌ Message box not found');
    await browser.disconnect();
    return;
  }

  // Clear and type
  await msgBox.click({ clickCount: 3 });
  await liPage.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 300));
  await liPage.type('.msg-form__contenteditable[contenteditable="true"]', replyText, { delay: 20 });
  await new Promise(r => setTimeout(r, 1000));

  console.log('✅ Typed message');

  // Try clicking send button
  const sendClicked = await liPage.evaluate(() => {
    // Try multiple send button selectors
    const selectors = [
      'button.msg-form__send-button',
      'button[aria-label="Send"]',
      'button[data-control-name="send"]',
      '.msg-form__send-toggle',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        console.log('Clicking:', sel);
        btn.click();
        return sel;
      }
    }
    return null;
  });

  if (sendClicked) {
    console.log('✅ Send button clicked:', sendClicked);
  } else {
    // Fallback: press Enter
    console.log('Send button not found, pressing Enter...');
    await liPage.keyboard.press('Enter');
  }

  await new Promise(r => setTimeout(r, 2500));

  // Verify
  const lastMsg = await liPage.evaluate(() => {
    const msgs = document.querySelectorAll('.msg-s-message-list__event .msg-s-event-listitem__body, .msg-s-event-listitem .msg-s-event-listitem__message-content');
    const all = Array.from(msgs).map(m => m.innerText?.trim()).filter(Boolean);
    return all[all.length - 1] || 'Not found';
  });

  console.log('\n📝 Last message in thread now:', lastMsg?.substring(0, 200));

  await browser.disconnect();
})().catch(e => console.error('ERROR:', e.message));
