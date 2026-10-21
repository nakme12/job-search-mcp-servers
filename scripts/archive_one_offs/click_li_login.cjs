const puppeteer = require('puppeteer-core');

async function checkLinkedInLogin() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const dbTab = pages.find(p => p.url().includes('darwinbox.in'));

  console.log('Clicking "Sign In with LinkedIn" on Darwinbox...');
  await dbTab.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const liBtn = btns.find(b => b.innerText.includes('Sign In with LinkedIn') || b.innerText.includes('LinkedIn'));
    if (liBtn) liBtn.click();
  });

  await new Promise(r => setTimeout(r, 4500));

  const state = await dbTab.evaluate(() => {
    return {
      url: window.location.href,
      snippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' ')
    };
  });

  console.log('Result After LinkedIn Sign In Click:\n', JSON.stringify(state, null, 2));
}

checkLinkedInLogin().catch(console.error);
