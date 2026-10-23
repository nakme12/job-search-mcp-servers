const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    // Trigger modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
      if (btn) ['mousedown', 'mouseup', 'click'].forEach(e => btn.dispatchEvent(new MouseEvent(e, { bubbles: true })));
    });
    await new Promise(r => setTimeout(r, 3000));

    // Fill form and click Save and continue
    const result = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      // Numbers: Experience, Intern, Current CTC, Expected CTC
      const numInputs = inputs.filter(i => i.type === 'number');
      numInputs.forEach(i => {
        if (i.placeholder && i.placeholder.includes('6')) i.value = '1.5';
      });

      // City
      const city = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('city'));
      if (city && !city.value) city.value = 'Indore';

      // Click Save and continue
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Save and continue');
      if (saveBtn) {
        saveBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    });

    console.log('Submission clicked:', result);
    await new Promise(r => setTimeout(r, 5000));

    const finalState = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return {
        url: window.location.href,
        snippet: text.substring(0, 500).replace(/\s+/g, ' ')
      };
    });

    console.log('\n======================================================');
    console.log('🎯 FINAL SUBMISSION RESULT:');
    console.log('URL:', finalState.url);
    console.log('Snippet:', finalState.snippet);
    console.log('======================================================\n');

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await page.close();
    browser.disconnect();
  }
})();
