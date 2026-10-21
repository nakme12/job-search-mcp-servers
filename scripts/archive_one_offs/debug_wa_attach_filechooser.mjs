import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Let's inspect the paperclip button exactly
  console.log('Inspecting attach button...');
  const attachBtn = await wa.$('span[data-icon="attach-menu-plus"], span[data-icon="plus"]');
  if (!attachBtn) {
    console.error('Attach button not found');
    await browser.disconnect();
    return;
  }

  // Click it
  await attachBtn.click();
  await sleep(1500);

  // Take screenshot of open menu
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_menu_open.png' });

  // Get all elements in DOM
  const menuElements = await wa.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.innerText?.trim();
      return text === 'Document' || text === 'Photos & videos';
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: el.innerText.trim(), x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: r.width, h: r.height };
    });
  });

  console.log('Menu targets:', JSON.stringify(menuElements, null, 2));

  // If Document element found, let's use file chooser intercept!
  const docTarget = menuElements.find(m => m.text === 'Document');
  if (docTarget) {
    console.log(`Clicking Document at (${docTarget.x}, ${docTarget.y}) with fileChooser listener...`);
    const [fileChooser] = await Promise.all([
      wa.waitForFileChooser({ timeout: 5000 }).catch(e => {
        console.log('waitForFileChooser timed out:', e.message);
        return null;
      }),
      wa.mouse.click(docTarget.x, docTarget.y)
    ]);

    if (fileChooser) {
      console.log('Intercepted native file chooser! Accepting FE Resume...');
      await fileChooser.accept([feResume]);
      await sleep(4000);
      await wa.screenshot({ path: 'screenshots/2026-10-12/wa_doc_preview_active.png' });
    } else {
      console.log('FileChooser not triggered by click.');
    }
  }

  await browser.disconnect();
}

main().catch(console.error);
