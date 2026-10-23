const puppeteer = require('puppeteer-core');

async function debugAndClickApply() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const target = pages[0];
  await target.bringToFront();

  // Find Apply now button
  const buttons = await target.$$('button');
  let applyBtn = null;
  for (const b of buttons) {
    const text = await target.evaluate(el => el.innerText.trim(), b);
    if (text === 'Apply now') {
      applyBtn = b;
      break;
    }
  }

  if (applyBtn) {
    const rect = await target.evaluate(b => {
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, applyBtn);

    console.log('Clicking Apply now via mouse at:', rect);
    await target.mouse.click(rect.x, rect.y);
    await new Promise(r => setTimeout(r, 4000));

    // Check if modal opened
    const modalText = await target.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const modal = allDivs.find(d => d.className && typeof d.className === 'string' && d.className.includes('modal'));
      return modal ? modal.innerText.substring(0, 500) : 'NO_MODAL_FOUND';
    });

    console.log('Modal after click:\n', modalText);
  } else {
    console.log('Apply now button not found on page.');
  }

  browser.disconnect();
}

debugAndClickApply().catch(console.error);
