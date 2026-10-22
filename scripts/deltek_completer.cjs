const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    // Close zaax tab if open (already submitted)
    for (const p of pages) {
      if (p.url().includes('zaax.com/submit-resume')) {
        console.log('[Tab Cleanup] Closing already-submitted zaax tab...');
        await p.close();
      }
    }

    const deltek = (await browser.pages()).find(p => p.url().includes('sjobs.brassring.com'));
    if (!deltek) {
      console.log('Deltek tab not found!');
      process.exit(0);
    }

    console.log('[Deltek] Found Deltek tab, title:', await deltek.title());

    // Loop through remaining steps
    for (let step = 3; step <= 8; step++) {
      await new Promise(r => setTimeout(r, 2000));
      const title = await deltek.title();
      console.log(`[Deltek Step ${step}] Title: ${title}`);

      // Check if already reached confirmation
      const content = await deltek.content();
      if (content.includes('Thank you') || content.includes('Application submitted') || content.includes('Your application has been received') || content.includes('successfully submitted')) {
        console.log('[Deltek] CONFIRMATION DETECTED!');
        break;
      }

      // Fill current page inputs
      await deltek.evaluate(() => {
        // Dropdowns / selects
        const selects = document.querySelectorAll('select');
        selects.forEach(sel => {
          if (sel.options && sel.options.length > 1) {
            const lbl = (sel.closest('.form-group') || sel.parentElement)?.innerText || '';
            console.log('Select field:', lbl);
            if (lbl.toLowerCase().includes('travel')) {
              // Pick 10% or minimal travel or No
              for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].text.includes('10%') || sel.options[i].text.includes('No') || sel.options[i].text.includes('Minimal')) {
                  sel.selectedIndex = i;
                  sel.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
            } else if (lbl.toLowerCase().includes('hear about') || lbl.toLowerCase().includes('source')) {
              for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].text.toLowerCase().includes('linkedin') || sel.options[i].text.toLowerCase().includes('job board') || sel.options[i].text.toLowerCase().includes('other') || sel.options[i].text.toLowerCase().includes('career')) {
                  sel.selectedIndex = i;
                  sel.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
              if (sel.selectedIndex === 0 && sel.options.length > 1) {
                sel.selectedIndex = 1;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
              }
            } else if (lbl.toLowerCase().includes('gender') || lbl.toLowerCase().includes('sex')) {
              for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].text.toLowerCase().includes('male') && !sel.options[i].text.toLowerCase().includes('female')) {
                  sel.selectedIndex = i;
                  sel.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
            } else {
              // Default to first valid option if unselected
              if (sel.selectedIndex <= 0 && sel.options.length > 1) {
                sel.selectedIndex = 1;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }
        });

        // Radios
        const radios = document.querySelectorAll('input[type="radio"]');
        radios.forEach(r => {
          const lbl = (r.closest('.form-group') || r.parentElement)?.innerText || '';
          const rVal = (r.value || r.id || '').toLowerCase();
          if (lbl.toLowerCase().includes('relocate') || lbl.toLowerCase().includes('willing to relocate')) {
            if (rVal.includes('yes')) r.click();
          } else if (lbl.toLowerCase().includes('authorized') || lbl.toLowerCase().includes('eligible')) {
            if (rVal.includes('yes')) r.click();
          } else if (lbl.toLowerCase().includes('sponsorship') || lbl.toLowerCase().includes('require sponsorship')) {
            if (rVal.includes('no')) r.click();
          } else if (lbl.toLowerCase().includes('previously employed') || lbl.toLowerCase().includes('worked for')) {
            if (rVal.includes('no')) r.click();
          } else if (lbl.toLowerCase().includes('relative') || lbl.toLowerCase().includes('family')) {
            if (rVal.includes('no')) r.click();
          } else if (lbl.toLowerCase().includes('disability')) {
            if (rVal.includes('no') || r.parentElement.innerText.includes('No') || r.parentElement.innerText.includes('I don\'t')) {
              r.click();
            }
          } else if (lbl.toLowerCase().includes('veteran')) {
            if (rVal.includes('no') || r.parentElement.innerText.includes('not a veteran') || r.parentElement.innerText.includes('No')) {
              r.click();
            }
          }
        });

        // Text inputs
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        inputs.forEach(inp => {
          if (!inp.value || inp.value.trim() === '') {
            const lbl = (inp.closest('.form-group') || inp.parentElement)?.innerText || '';
            if (lbl.toLowerCase().includes('salary') || lbl.toLowerCase().includes('compensation')) {
              inp.value = '465000';
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (lbl.toLowerCase().includes('start') || lbl.toLowerCase().includes('available') || lbl.toLowerCase().includes('notice')) {
              inp.value = '15 Days';
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (lbl.toLowerCase().includes('signature') || lbl.toLowerCase().includes('full name')) {
              inp.value = 'Pratik Patidar';
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });

        // Checkboxes
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
          const lbl = (cb.closest('.form-group') || cb.parentElement)?.innerText || '';
          if (lbl.toLowerCase().includes('acknowledge') || lbl.toLowerCase().includes('agree') || lbl.toLowerCase().includes('certify') || lbl.toLowerCase().includes('consent')) {
            if (!cb.checked) cb.click();
          }
        });
      });

      await new Promise(r => setTimeout(r, 1500));

      // Click Continue / Next / Submit button
      const clicked = await deltek.evaluate(() => {
        const nextBtn = document.getElementById('shownext') || 
                        document.querySelector('button[ng-click*="goNext"]') || 
                        document.querySelector('button[id*="submit"]') ||
                        document.querySelector('input[type="submit"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => {
                          const t = b.innerText.trim().toLowerCase();
                          return t === 'continue' || t === 'next' || t === 'submit' || t === 'submit application' || t === 'send';
                        });
        if (nextBtn) {
          console.log('Clicking button:', nextBtn.innerText || nextBtn.id);
          nextBtn.click();
          return nextBtn.innerText || nextBtn.id;
        }
        return null;
      });

      console.log(`[Deltek Step ${step}] Action button clicked:`, clicked);
      await new Promise(r => setTimeout(r, 4000));
    }

    // Final confirmation check & screenshot
    await new Promise(r => setTimeout(r, 3000));
    const finalContent = await deltek.content();
    const isSubmitted = finalContent.includes('Thank you') || 
                        finalContent.includes('Application submitted') || 
                        finalContent.includes('received your application') || 
                        finalContent.includes('successfully submitted') ||
                        (await deltek.title()).toLowerCase().includes('thank') ||
                        (await deltek.title()).toLowerCase().includes('submitted');

    const screenshotDir = path.join('C:', 'mcp', 'job-search-mcp-engine', 'screenshots', '2026-10-19', 'shift1');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'deltek_brassring_applied.png');

    await deltek.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[Deltek] Screenshot captured: ${screenshotPath}`);

    if (isSubmitted) {
      console.log('>>> DELTEK CONFIRMED SUBMITTED! <<<');
      // Append to applied_todays_2026-10-19.json
      const appliedPath = path.join('C:', 'mcp', 'job-search-mcp-engine', 'applied_todays_2026-10-19.json');
      let applied = [];
      if (fs.existsSync(appliedPath)) {
        applied = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      }
      const newEntry = {
        id: `deltek-brassring-${Date.now()}`,
        company: 'Deltek',
        role: 'Software Engineer',
        platform: 'Brassring ATS (Direct)',
        url: deltek.url(),
        applied_at: new Date().toISOString(),
        screenshot: 'screenshots/2026-10-19/shift1/deltek_brassring_applied.png',
        status: 'CONFIRMED_APPLIED'
      };
      applied.push(newEntry);
      fs.writeFileSync(appliedPath, JSON.stringify(applied, null, 2), 'utf8');
      console.log(`[Deltek] Application recorded in applied_todays_2026-10-19.json! Total now: ${applied.length}`);

      // Close tab cleanly per Rule 57
      await deltek.close();
      console.log('[Deltek] Tab cleanly closed per Rule 57.');
    } else {
      console.log('[Deltek] Form submitted or pending further human review. Left tab open for inspection.');
    }

  } catch (err) {
    console.error('[Deltek Runner Error]:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
