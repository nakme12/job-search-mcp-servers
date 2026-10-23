const puppeteer = require('puppeteer-core');

async function testHumanMovement() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  console.log('Target tab:', page.url());

  // Emulate organic human mouse movements across viewport
  console.log('Generating human mouse trajectory...');
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(100 + Math.random() * 600);
    const y = Math.floor(100 + Math.random() * 500);
    await page.mouse.move(x, y, { steps: 5 });
    await new Promise(r => setTimeout(r, 60));
  }
  
  // Smooth scroll down
  console.log('Smooth scrolling down...');
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await new Promise(r => setTimeout(r, 1000));

  // Check grecaptcha enterprise token generation
  const token = await page.evaluate(async () => {
    if (window.grecaptcha && window.grecaptcha.enterprise && typeof window.grecaptcha.enterprise.execute === 'function') {
      try {
        const t = await window.grecaptcha.enterprise.execute('6LezdY0tAAAAAEnollNLCAI0z1VDGwM7AzGrU4XZ', { action: 'submit_application' });
        return { success: true, tokenLength: t ? t.length : 0 };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'no grecaptcha' };
  });
  console.log('Invisible reCAPTCHA token check:', token);

  // Now find submit button and click it organically
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    const box = await submitBtn.boundingBox();
    if (box) {
      console.log('Moving mouse to submit button at', box.x, box.y);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await new Promise(r => setTimeout(r, 300));
      await page.mouse.down();
      await new Promise(r => setTimeout(r, 120));
      await page.mouse.up();
      console.log('Clicked submit button via CDP mouse events!');
    }
  }

  // Wait 4s and see what happens on DOM
  await new Promise(r => setTimeout(r, 4000));
  const postClick = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    return {
      snippet: text.substring(0, 300).replace(/\n+/g, ' '),
      isConfirmed: text.includes('Thank you') || text.includes('Application submitted') || text.includes('Submission received')
    };
  });
  console.log('Post-submit DOM status:', JSON.stringify(postClick, null, 2));

  await browser.disconnect();
}
testHumanMovement().catch(console.error);
