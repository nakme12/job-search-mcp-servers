const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Clicking "Apply now" button...');
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const b = btns.find(x => x.innerText && x.innerText.trim().toLowerCase() === 'apply now');
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('Apply now button clicked:', clicked);
    await new Promise(r => setTimeout(r, 4000));

    const modalState = await page.evaluate(() => {
      const allText = document.body ? document.body.innerText : '';
      const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 50);
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        tag: i.tagName,
        type: i.type,
        placeholder: i.placeholder,
        value: i.value
      }));
      return {
        url: window.location.href,
        buttons: buttons.slice(0, 25),
        inputs,
        hasConfirmation: /applied successfully|application submitted|thank you for applying|already applied/i.test(allText),
        bodySnippet: allText.substring(0, 600).replace(/\s+/g, ' ')
      };
    });

    console.log('\n======================================================');
    console.log('🎯 CUTSHORT MODAL STATE AFTER "Apply now":');
    console.log('URL:', modalState.url);
    console.log('Inputs:', JSON.stringify(modalState.inputs, null, 2));
    console.log('Buttons:', JSON.stringify(modalState.buttons, null, 2));
    console.log('Has Confirmation:', modalState.hasConfirmation);
    console.log('Snippet:', modalState.bodySnippet);
    console.log('======================================================\n');

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();
