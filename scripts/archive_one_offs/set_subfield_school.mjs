import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function setSubfieldAndSchool() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) {
    console.error('Handshake page not found');
    await browser.disconnect();
    return;
  }

  console.log('1. Setting Subfield(s) -> javascript, HTML, Computer Programming');
  await page.evaluate(() => {
    const listbox = document.getElementById('listbox-_r_3n_');
    if (listbox) {
      const items = Array.from(listbox.querySelectorAll('[role="option"], li, div'));
      items.forEach(it => {
        const text = it.innerText.toLowerCase().trim();
        if (text === 'javascript' || text === 'html' || text === 'computer programming') {
          it.click();
        }
      });
    }
  });
  await sleep(1000);

  // 2. Set School Name accurately
  console.log('2. Setting School Name -> Barkatullah University, Bhopal');
  await page.evaluate(() => {
    const schoolInput = document.getElementById('_r_3v_');
    if (schoolInput) {
      schoolInput.value = '';
      schoolInput.focus();
      document.execCommand('insertText', false, 'Barkatullah University, Bhopal');
    }
  });
  await sleep(1000);

  // 3. Take screenshot
  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_subfield_filled.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_subfield_filled.png');

  await browser.disconnect();
}

setSubfieldAndSchool().catch(console.error);
