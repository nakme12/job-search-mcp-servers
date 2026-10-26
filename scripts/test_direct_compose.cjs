const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  console.log('Navigating to direct compose URL...');
  await p.goto('https://mail.google.com/mail/u/0/?view=cm&fs=1&to=hrd@greenfordconstruction.co.uk', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 4000));

  const state = await p.evaluate(() => {
    const toInput = document.querySelector('input[aria-label="To recipients"], input[name="to"], div[name="to"]');
    const chip = document.querySelector('span[email], div[data-hovercard-id]');
    const subj = document.querySelector('input[name="subjectbox"]');
    const editor = document.querySelector('div[aria-label="Message Body"]');
    return {
      toInputVal: toInput ? (toInput.value || toInput.innerText) : null,
      chipEmail: chip ? (chip.getAttribute('email') || chip.innerText) : null,
      hasSubj: !!subj,
      hasEditor: !!editor,
      url: window.location.href
    };
  });

  console.log('Direct Compose State:', JSON.stringify(state, null, 2));
  b.disconnect();
})();
