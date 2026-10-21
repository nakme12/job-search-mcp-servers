const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    const targetUrl = 'https://cutshort.io/job/MERN-Stack-Developer-Intern-Octalbees-W2Y03F0H?utm_campaign=adzuna_jobs&utm_source=adzuna&utm_medium=organic';
    console.log('Navigating to Octalbees Cutshort job:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Outside click & escape to clear exit-intent
    await page.mouse.click(15, 15);
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));

    // Check Apply Button
    console.log('Looking for Apply button...');
    const applyBtnFound = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const btn = btns.find(b => b.innerText && b.innerText.trim().toLowerCase().includes('apply to this job'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Apply button clicked:', applyBtnFound);
    await new Promise(r => setTimeout(r, 5000));

    // Analyze live DOM after apply button click
    const afterClickAnalysis = await page.evaluate(() => {
      const allText = document.body ? document.body.innerText : '';
      const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 60);
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName,
        type: i.type || null,
        name: i.name || null,
        placeholder: i.placeholder || null,
        value: i.value || null
      }));
      return {
        url: window.location.href,
        title: document.title,
        inputs,
        buttons: buttons.slice(0, 30),
        snippet: allText.substring(0, 800).replace(/\s+/g, ' ')
      };
    });

    console.log('\n======================================================');
    console.log('🎯 CUTSHORT POST-APPLY LIVE DOM ANALYSIS:');
    console.log('Current URL:', afterClickAnalysis.url);
    console.log('Current Title:', afterClickAnalysis.title);
    console.log('Inputs found:', JSON.stringify(afterClickAnalysis.inputs, null, 2));
    console.log('Buttons found:', JSON.stringify(afterClickAnalysis.buttons, null, 2));
    console.log('Snippet:', afterClickAnalysis.snippet);
    console.log('======================================================\n');

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
})();
