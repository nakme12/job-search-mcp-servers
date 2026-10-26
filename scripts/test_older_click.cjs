const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // Find the exact Older button in the DOM
  const btnInfo = await p.evaluate(() => {
    const olderBtn = document.querySelector('div[aria-label="Older"][role="button"]');
    if (!olderBtn) return { error: 'not found' };
    const rect = olderBtn.getBoundingClientRect();
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      visible: rect.width > 0 && rect.height > 0,
      ariaDisabled: olderBtn.getAttribute('aria-disabled')
    };
  });

  console.log('Older button coordinates & state:', btnInfo);

  if (btnInfo.visible && btnInfo.ariaDisabled !== 'true') {
    console.log('Clicking via page.mouse.click at', btnInfo.x, btnInfo.y);
    await p.mouse.click(btnInfo.x, btnInfo.y);
    await new Promise(r => setTimeout(r, 4000));

    const newRows = await p.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
      return trs.slice(0, 5).map(r => {
        const s = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
        const subj = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
        const d = r.querySelector('.xW, .m1')?.innerText.trim() || '';
        return { s, subj, d };
      });
    });

    console.log('New rows after real mouse click:\n', JSON.stringify(newRows, null, 2));
  }

  b.disconnect();
})();
