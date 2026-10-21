const puppeteer = require('puppeteer-core');

async function checkApplyNow() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const target = pages.find(p => p.url().includes('cutshort.io/profile/all-jobs'));
  if (!target) {
    console.log('No Cutshort job page found');
    return;
  }

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
    console.log('Clicking Apply now at coordinates:', rect);
    await target.mouse.click(rect.x, rect.y);
  } else {
    console.log('Apply now button not found!');
  }

  await new Promise(r => setTimeout(r, 4000));

  const pageInfo = await target.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const modals = Array.from(document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="drawer"]')).map(m => m.innerText.substring(0, 300));
    return {
      modals,
      bodySnippet: text.substring(0, 800).replace(/\s+/g, ' ')
    };
  });

  console.log('Result after clicking Apply now:\n', JSON.stringify(pageInfo, null, 2));
}

checkApplyNow().catch(console.error);
