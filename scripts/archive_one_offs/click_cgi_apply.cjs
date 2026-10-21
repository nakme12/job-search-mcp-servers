const puppeteer = require('puppeteer-core');

async function checkCGIApply() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const cgiTab = pages.find(p => p.url().includes('njoyn.com'));

  const applyAction = await cgiTab.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
    const applyTarget = links.find(l => (l.innerText || l.value || '').toLowerCase().includes('apply'));
    return {
      hasApply: !!applyTarget,
      text: applyTarget ? (applyTarget.innerText || applyTarget.value) : 'NONE',
      href: applyTarget ? applyTarget.href : null
    };
  });

  console.log('CGI Apply Action on page:\n', JSON.stringify(applyAction, null, 2));

  if (applyAction.hasApply) {
    console.log('Clicking Apply on CGI page...');
    await cgiTab.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
      const applyTarget = links.find(l => (l.innerText || l.value || '').toLowerCase().includes('apply'));
      if (applyTarget) applyTarget.click();
    });

    await new Promise(r => setTimeout(r, 4000));
    console.log('New CGI URL after click:', cgiTab.url());
  }
}

checkCGIApply().catch(console.error);
