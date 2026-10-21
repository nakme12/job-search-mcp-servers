import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Let's inspect the footer buttons
  const footerBtns = await wa.evaluate(() => {
    const f = document.querySelector('footer');
    if (!f) return [];
    return Array.from(f.querySelectorAll('button, [role="button"]')).map(b => {
      const r = b.getBoundingClientRect();
      return {
        aria: b.getAttribute('aria-label'),
        text: b.innerText,
        x: Math.round(r.x + r.width/2),
        y: Math.round(r.y + r.height/2),
        w: Math.round(r.width),
        h: Math.round(r.height),
        html: b.outerHTML.substring(0, 150)
      };
    });
  });

  console.log('Footer buttons:', JSON.stringify(footerBtns, null, 2));

  // Find the attach button
  const attach = footerBtns.find(b => b.aria === 'Attach' || b.html.includes('plus') || b.html.includes('Attach'));
  if (attach) {
    console.log(`Clicking attach at (${attach.x}, ${attach.y})...`);
    await wa.mouse.click(attach.x, attach.y);
    await sleep(2000);
    await wa.screenshot({ path: 'screenshots/2026-10-12/menu_opened_live.png' });

    // Find all menu items
    const menuItems = await wa.evaluate(() => {
      return Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'))
        .filter(el => {
          const t = el.innerText?.trim();
          return t === 'Document' || t === 'Photos & videos';
        })
        .map(el => {
          const r = el.getBoundingClientRect();
          return {
            text: el.innerText.trim(),
            tag: el.tagName,
            x: Math.round(r.x + r.width/2),
            y: Math.round(r.y + r.height/2)
          };
        });
    });

    console.log('Menu items detected:', JSON.stringify(menuItems, null, 2));

    const docTarget = menuItems.find(m => m.text === 'Document');
    if (docTarget) {
      console.log(`Clicking Document at (${docTarget.x}, ${docTarget.y})...`);
      
      // Look at input[type="file"] elements BEFORE and AFTER
      const beforeInps = (await wa.$$('input[type="file"]')).length;
      console.log('Inputs before click:', beforeInps);

      await wa.mouse.click(docTarget.x, docTarget.y);
      await sleep(2000);

      const afterInps = await wa.$$('input[type="file"]');
      console.log('Inputs after click:', afterInps.length);

      // Upload file to the newest input
      const docInput = afterInps[afterInps.length - 1];
      if (docInput) {
        console.log('Uploading FE Resume to docInput...');
        await docInput.uploadFile(feResume);
        await sleep(4000);

        await wa.screenshot({ path: 'screenshots/2026-10-12/fe_preview_modal.png' });

        // Click send
        console.log('Clicking send...');
        await wa.evaluate(() => {
          const sendBtn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
                       || document.querySelector('[aria-label="Send"]');
          if (sendBtn) sendBtn.click();
        });
        await sleep(5000);
      }
    }
  }

  await browser.disconnect();
}

main().catch(console.error);
