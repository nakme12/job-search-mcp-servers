const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  
  if (!deltekPage) return;

  const modalInfo = await deltekPage.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || document.querySelector('.modal') || Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Add résumé/CV'));
    if (!modal) return 'modal not found';
    return {
      modalHtml: modal.innerHTML.slice(0, 2000),
      buttons: Array.from(modal.querySelectorAll('*')).map(e => ({ tag: e.tagName, id: e.id, class: e.className, text: e.innerText ? e.innerText.trim() : '' })).filter(e => e.text.length > 0 && e.text.length < 50)
    };
  });

  console.log('Modal info:', JSON.stringify(modalInfo, null, 2));
})();
