const puppeteer = require('puppeteer-core');

async function doRealPhysicalInput() {
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

  // 1. Get exact element coords for notice period input and checkbox
  const coords = await target.evaluate(() => {
    const noticeInp = document.querySelector('input[name="canJoinHowSoon"]');
    const chk = document.querySelector('input[type="checkbox"]');
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Save and continue');

    const noticeRect = noticeInp ? noticeInp.getBoundingClientRect() : null;
    const chkRect = chk ? chk.getBoundingClientRect() : null;
    const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

    return {
      notice: noticeRect ? { x: noticeRect.x + noticeRect.width / 2, y: noticeRect.y + noticeRect.height / 2 } : null,
      chk: chkRect ? { x: chkRect.x + chkRect.width / 2, y: chkRect.y + chkRect.height / 2 } : null,
      save: saveRect ? { x: saveRect.x + saveRect.width / 2, y: saveRect.y + saveRect.height / 2 } : null
    };
  });

  console.log('Coords:', coords);

  // 2. Physical mouse click and typing for Notice Period
  if (coords.notice) {
    await target.mouse.click(coords.notice.x, coords.notice.y);
    await new Promise(r => setTimeout(r, 200));
    await target.keyboard.down('Control');
    await target.keyboard.press('KeyA');
    await target.keyboard.up('Control');
    await target.keyboard.press('Backspace');
    await target.keyboard.type('15');
    console.log('Typed 15 into Notice Period!');
  }

  // 3. Physical mouse click on Checkbox
  if (coords.chk) {
    await target.mouse.click(coords.chk.x, coords.chk.y);
    console.log('Clicked Declaration Checkbox!');
  }

  await new Promise(r => setTimeout(r, 1000));

  // 4. Physical mouse click on Save and continue
  if (coords.save) {
    await target.mouse.click(coords.save.x, coords.save.y);
    console.log('Clicked Save and continue!');
  }

  await new Promise(r => setTimeout(r, 5000));

  const result = await target.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const modalExists = Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.trim() === 'Save and continue');
    return {
      modalExists,
      url: window.location.href,
      textSnippet: text.substring(0, 600).replace(/\s+/g, ' ')
    };
  });

  console.log('Post-submit result:', JSON.stringify(result, null, 2));
}

doRealPhysicalInput().catch(console.error);
