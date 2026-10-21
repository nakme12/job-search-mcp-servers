const puppeteer = require('puppeteer-core');

async function closePopupAndFindCareerForm() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('vasudevs.com'));

  // Close the Get a Quote modal
  await p.evaluate(() => {
    const closeBtn = document.querySelector('.dialog-close-button, button[aria-label="Close"], .close-modal');
    if (closeBtn) closeBtn.click();
    // Also scroll down to bottom where career form usually resides
    window.scrollTo(0, document.body.scrollHeight / 2);
  });

  await new Promise(r => setTimeout(r, 2000));

  const pageInfo = await p.evaluate(() => {
    const text = document.body.innerText;
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      id: f.id,
      className: f.className,
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.placeholder || i.name)
    }));

    return {
      forms,
      emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    };
  });

  console.log('Page Forms & Contacts:\n', JSON.stringify(pageInfo, null, 2));
}

closePopupAndFindCareerForm().catch(console.error);
