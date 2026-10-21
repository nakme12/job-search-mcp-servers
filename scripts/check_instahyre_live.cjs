const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    const instahyre = pages.find(p => p.url().includes('instahyre.com'));
    if (!instahyre) {
      console.log('Instahyre tab not found');
      return;
    }
    
    console.log('Inspecting Instahyre opportunities...');
    const result = await instahyre.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div.opportunity-card, div.job-overview, div.card'));
      const text = document.body.innerText;
      const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        return t === 'apply' || t.includes('apply');
      }).map(el => ({ tag: el.tagName, text: el.innerText.trim(), cls: el.className }));
      
      return {
        url: window.location.href,
        cardsCount: cards.length,
        applyButtons,
        snippet: text.slice(0, 500).replace(/\n+/g, ' ')
      };
    });
    console.log('Instahyre live state:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
