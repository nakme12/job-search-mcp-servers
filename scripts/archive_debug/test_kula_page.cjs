const puppeteer = require('puppeteer-core');

async function testKula() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto('https://careers.kula.ai/cashfree/jobs/4585', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log('Resolved URL:', page.url());
    
    const applyBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      return btns.find(b => b.innerText.toLowerCase().includes('apply for this position') || b.innerText.trim().toLowerCase() === 'apply');
    });
    
    if (applyBtn) {
      console.log('Apply button found! Clicking...');
      await applyBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      console.log('Post-click URL:', page.url());
      
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
          tag: i.tagName,
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          label: i.closest('label')?.innerText || i.parentElement?.innerText?.slice(0, 40)
        }));
      });
      console.log('Form Inputs found:', inputs);
    } else {
      console.log('No apply button found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await page.close();
    browser.disconnect();
  }
}

testKula();
