const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const deltek = (await browser.pages()).find(p => p.url().includes('sjobs.brassring.com'));
    if (!deltek) {
      console.log('Deltek tab not found!');
      process.exit(0);
    }

    console.log('[Deltek] Resuming at:', await deltek.title());

    for (let loop = 1; loop <= 10; loop++) {
      const currentTitle = await deltek.title();
      console.log(`\n--- [Step Loop ${loop}] Title: ${currentTitle} ---`);

      // Check if submitted / confirmed
      const bodyText = await deltek.evaluate(() => document.body.innerText);
      if (bodyText.includes('Thank you for applying') || 
          bodyText.includes('Your application has been received') || 
          bodyText.includes('Application submitted') || 
          bodyText.includes('successfully submitted') ||
          currentTitle.toLowerCase().includes('thank')) {
        console.log('>>> APPLICATION CONFIRMATION DETECTED! <<<');
        break;
      }

      // Answer questions based on current page
      await deltek.evaluate(() => {
        // Handle Licenses & Certifications & Patents
        const certNo = document.getElementById('radio-15196-No');
        if (certNo) certNo.click();
        const patentNo = document.getElementById('radio-15468-No');
        if (patentNo) patentNo.click();

        // Any other radio questions
        document.querySelectorAll('input[type="radio"]').forEach(r => {
          const lbl = (r.closest('.fieldcontain') || r.parentElement)?.innerText?.toLowerCase() || '';
          const val = (r.value || r.id || '').toLowerCase();
          if (lbl.includes('disability') || lbl.includes('veteran') || lbl.includes('felony') || lbl.includes('certif') || lbl.includes('patent') || lbl.includes('conflict') || lbl.includes('lawsuit')) {
            if (val.includes('no') || r.parentElement?.innerText?.toLowerCase().includes('no')) r.click();
          } else if (lbl.includes('acknowledge') || lbl.includes('agree') || lbl.includes('certify') || lbl.includes('terms') || lbl.includes('legal authorization')) {
            if (val.includes('yes') || r.parentElement?.innerText?.toLowerCase().includes('yes')) r.click();
          }
        });

        // Any dropdowns
        document.querySelectorAll('select').forEach(s => {
          if (s.selectedIndex <= 0 && s.options.length > 1) {
            for (let i = 1; i < s.options.length; i++) {
              const txt = s.options[i].text.toLowerCase();
              if (!txt.includes('choose') && !txt.includes('select')) {
                s.selectedIndex = i;
                s.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }
        });

        // Any text inputs (e.g. Signature, full name)
        document.querySelectorAll('input[type="text"]').forEach(t => {
          if (!t.value || t.value.trim() === '') {
            const lbl = (t.closest('.fieldcontain') || t.parentElement)?.innerText?.toLowerCase() || '';
            if (lbl.includes('signature') || lbl.includes('name') || lbl.includes('sign here')) {
              t.value = 'Pratik Patidar';
              t.dispatchEvent(new Event('input', { bubbles: true }));
              t.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });

        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(c => {
          if (!c.checked && c.id !== 'darkModeInput') c.click();
        });
      });

      await new Promise(r => setTimeout(r, 1000));

      // Click button: either shownext or submit
      const clickedBtn = await deltek.evaluate(() => {
        // Look for send my application or submit first
        const submitBtn = document.querySelector('button[id*="submit"], input[type="submit"], button.send-application, [ng-click*="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return submitBtn.innerText || submitBtn.id;
        }

        const buttons = Array.from(document.querySelectorAll('button, a.btn, input[type="button"]'));
        const targetBtn = buttons.find(b => {
          const t = b.innerText.trim().toLowerCase();
          return t === 'send my application' || t === 'submit application' || t === 'submit' || t === 'continue';
        });

        if (targetBtn) {
          targetBtn.click();
          return targetBtn.innerText || targetBtn.id;
        }

        const next = document.getElementById('shownext');
        if (next) {
          next.click();
          return 'shownext';
        }

        return null;
      });

      console.log(`[Step Loop ${loop}] Clicked:`, clickedBtn);
      await new Promise(r => setTimeout(r, 4000));
    }

    // Capture screenshot
    const screenshotDir = path.join('C:', 'mcp', 'job-search-mcp-engine', 'screenshots', '2026-10-19', 'shift1');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'deltek_brassring_applied.png');
    await deltek.screenshot({ path: screenshotPath, fullPage: false });
    console.log('[Deltek] Saved screenshot to:', screenshotPath);

    const finalTitle = await deltek.title();
    const finalBody = await deltek.evaluate(() => document.body.innerText);
    console.log('[Deltek Final Result Title]:', finalTitle);

    if (finalBody.includes('Thank you') || 
        finalBody.includes('Application submitted') || 
        finalBody.includes('successfully submitted') || 
        finalBody.includes('Your application has been received') ||
        finalTitle.toLowerCase().includes('thank') ||
        finalTitle.toLowerCase().includes('complete') ||
        finalTitle.toLowerCase().includes('submitted')) {
      
      console.log('>>> DELTEK CONFIRMED APPLIED! <<<');
      const appliedPath = path.join('C:', 'mcp', 'job-search-mcp-engine', 'applied_todays_2026-10-19.json');
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.total += 1;
      appliedData.jobs.push({
        id: appliedData.total,
        company: 'Deltek',
        role: 'Software Engineer',
        recipient: 'Deltek Talent Acquisition (Brassring)',
        channel: 'Direct ATS Portal (Brassring)',
        url: deltek.url(),
        applied_at: new Date().toISOString(),
        screenshot: 'screenshots/2026-10-19/shift1/deltek_brassring_applied.png',
        status: 'CONFIRMED_APPLIED'
      });
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2), 'utf8');
      console.log('[Deltek] Successfully recorded in applied_todays_2026-10-19.json! Total count now:', appliedData.total);

      // Close Deltek tab per Rule 57
      await deltek.close();
      console.log('[Deltek] Tab closed cleanly per Rule 57.');
    } else {
      console.log('[Deltek] Notice: Still on page or review screen. Check title/screenshot.');
    }

  } catch (err) {
    console.error('Deltek error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
