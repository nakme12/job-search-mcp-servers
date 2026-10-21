const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const homePage = pages.find(p => p.url().includes('mnjuser/homepage'));
  if (!homePage) {
    console.log('No homepage tab found.');
    return;
  }

  console.log('1. Homepage tab found:', await homePage.title());

  // Click Card 1 (Unico Connect)
  console.log('2. Clicking Card 1 (Unico Connect)...');
  const cardText = await homePage.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.cust-job-tuple'));
    if (cards.length > 1) {
      const targetCard = cards[1];
      const text = targetCard.innerText.replace(/\n+/g, ' | ');
      targetCard.scrollIntoView({ behavior: 'instant', block: 'center' });
      targetCard.click();
      return text;
    }
    return null;
  });

  console.log('Clicked card:', cardText);
  await new Promise(r => setTimeout(r, 4000));

  // Check open pages now
  const allPages = await browser.pages();
  console.log('Total open pages now:', allPages.length);
  for (let i = 0; i < allPages.length; i++) {
    console.log(`Page ${i}: ${await allPages[i].title()} | ${allPages[i].url()}`);
  }
})();
