const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const FORM_URL = "https://insights.zohorecruit.com/ck1/2d6f.390d3f0/e10a4d00-c7b6-11f1-a4e6-963d1902c9da/4407058944590fc6354e502853d78dca07a44544/2?e=3NZ8wEPJ9aLmdtNDMdn%2F18S0iGe8uyeekR3YhvHpNdPeLl%2BOruHUMY1njP8QDQD5%2FlLRa4955oGfJ3dCdii5WxGzUe2teREpBmjbjfX%2FB%2BQ9SLuYmNSe1Sqvj6OAN5y9b7b5q055Kn8VHyD%2FBoKwwmWUW3EhwUvB%2BC5DaY99vVT640%2FLRYcAlNDLHrElMm%2Fg3f5VoK%2FFKkvwG3Y0IA8LnTbMXRJyqn8C2cy9ovU0DRuCMG27D0BwrepPuFCPHY5A";

(async () => {
  let browser;
  try {
    console.log('[Penthara Assessment Form] Connecting to browser...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const p = await browser.newPage();

    console.log('Navigating to Penthara assessment form URL...');
    await p.goto(FORM_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(4000);

    const title = await p.title();
    const currentUrl = p.url();
    console.log(`Landed on: ${title} (${currentUrl})`);

    const formData = await p.evaluate(() => {
      const isAlreadySubmitted = document.body.innerText.toLowerCase().includes('already submitted') || 
                                 document.body.innerText.toLowerCase().includes('thank you for submitting') ||
                                 document.body.innerText.toLowerCase().includes('response has been recorded');

      const questions = Array.from(document.querySelectorAll('label, .question, .form-group, .field, h2, h3, h4, p')).map(el => el.innerText.trim()).filter(t => t.length > 5 && t.length < 200);

      const inputs = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
        tag: el.tagName,
        type: el.type || null,
        name: el.name || null,
        id: el.id || null,
        placeholder: el.placeholder || null,
        text: el.innerText ? el.innerText.trim() : null
      }));

      const bodySnippet = document.body.innerText.substring(0, 1500).replace(/\n+/g, ' \n ');

      return {
        title: document.title,
        url: window.location.href,
        isAlreadySubmitted,
        bodySnippet,
        inputs: inputs.slice(0, 20)
      };
    });

    console.log('=== PENTHARA FORM STATE ===');
    console.log(JSON.stringify(formData, null, 2));

    browser.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    if (browser) browser.disconnect();
  }
})();
