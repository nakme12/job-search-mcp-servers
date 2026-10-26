const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (p) {
    const dialogState = await p.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return { open: false };
      const toInput = dialog.querySelector('input[aria-label="To recipients"], input[name="to"]');
      const subj = dialog.querySelector('input[name="subjectbox"]');
      const body = dialog.querySelector('div[aria-label="Message Body"]');
      const chips = Array.from(dialog.querySelectorAll('span[email], div[data-hovercard-id]')).map(c => c.getAttribute('email') || c.innerText);
      return {
        open: true,
        toVal: toInput ? toInput.value : '',
        subjVal: subj ? subj.value : '',
        bodySnippet: body ? body.innerText.slice(0, 100) : '',
        chips
      };
    });
    console.log(JSON.stringify(dialogState, null, 2));
  }
  b.disconnect();
})();
