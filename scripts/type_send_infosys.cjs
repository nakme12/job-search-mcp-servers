const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));

  if (p) {
    await p.bringToFront();
    const isDis = await p.evaluate(() => {
      const btn = document.querySelector('button[name="send"]') ||
                  Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      return btn ? btn.disabled : true;
    });

    console.log('SEND Button disabled initially?', isDis);

    // Focus input and type cleanly
    await p.focus('#mat-input-0');
    await p.keyboard.down('Control');
    await p.keyboard.press('A');
    await p.keyboard.up('Control');
    await p.keyboard.press('Backspace');
    await p.keyboard.type('pratikpatidar7990@gmail.com', { delay: 40 });
    await new Promise(r => setTimeout(r, 600));

    // Blur to trigger Angular touched/dirty
    await p.evaluate(() => {
      const inp = document.querySelector('#mat-input-0');
      if (inp) inp.blur();
    });
    await new Promise(r => setTimeout(r, 600));

    const disabledAfter = await p.evaluate(() => {
      const btn = document.querySelector('button[name="send"]') ||
                  Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      return btn ? btn.disabled : true;
    });

    console.log('SEND Button disabled after typing?', disabledAfter);

    console.log('Clicking SEND button...');
    await p.evaluate(() => {
      const btn = document.querySelector('button[name="send"]') ||
                  Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 3500));

    const result = await p.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('.mat-snack-bar-container, .alert, .success, .error, p, span'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 10 && t.length < 250);
      return { bodySnippet: document.body.innerText.substring(0, 400).replace(/\n+/g, ' '), alerts: alerts.slice(0, 5) };
    });

    console.log('Result:\n', JSON.stringify(result, null, 2));
  } else {
    console.log('Infosys tab not found');
  }

  await b.disconnect();
})();
