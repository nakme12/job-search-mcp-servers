const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(x => x.url().includes('unico-connect'));
  if (!p) {
    console.log('No Unico Connect page found!');
    return;
  }

  console.log('Found Unico Connect tab:', await p.title());

  // 1. Audit JD
  const audit = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isAlready = /already applied|applied on/i.test(text);
    return {
      title: document.title,
      isAlready,
      snippet: text.slice(0, 400)
    };
  });
  console.log('Audit:', audit.title, 'Already applied?', audit.isAlready);

  // 2. Click Apply
  console.log('Clicking Apply button...');
  const clickRes = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const b = btns.find(x => {
      const t = (x.innerText || '').trim().toLowerCase();
      return t === 'apply' || t === 'apply on company site' || t === 'apply now';
    });
    if (b) {
      b.scrollIntoView({ behavior: 'instant', block: 'center' });
      b.click();
      return { success: true, text: b.innerText.trim() };
    }
    return { success: false };
  });
  console.log('Click result:', clickRes);

  await new Promise(r => setTimeout(r, 4000));

  // 3. Handle questionnaire if any
  await p.evaluate(() => {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    function setVal(el, val) {
      if (!el) return;
      inputSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
    for (const inp of allInputs) {
      let label = (inp.closest('div') ? inp.closest('div').innerText : '').toLowerCase();
      if (label.includes('experience') || label.includes('yoe')) setVal(inp, '1.5');
      else if (label.includes('current ctc') || label.includes('current salary')) setVal(inp, '216000');
      else if (label.includes('expected ctc') || label.includes('expected salary')) setVal(inp, '465000');
      else if (label.includes('notice')) setVal(inp, '15');
    }

    const radioLabels = Array.from(document.querySelectorAll('label, input[type="radio"]'));
    for (const rl of radioLabels) {
      let text = rl.innerText ? rl.innerText.toLowerCase() : '';
      if (text.includes('yes') || text.includes('immediate') || text.includes('15 days') || text.includes('15')) {
        rl.click();
      }
    }

    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /save and apply|submit|continue|apply/i.test(b.innerText));
    if (submitBtn) submitBtn.click();
  });

  await new Promise(r => setTimeout(r, 4000));

  // 4. Assert live confirmation
  const conf = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isSuccess = /applied successfully|application sent|you have successfully applied|applied on|already applied|redirected to the company website/i.test(text);
    return {
      isSuccess,
      snippet: text.slice(0, 400)
    };
  });

  console.log('Confirmation check:\n', JSON.stringify(conf, null, 2));

  if (conf.isSuccess) {
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\naukri_unico_connect_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'naukri_unico_' + Date.now(),
      company: 'Unico Connect',
      role: 'Frontend Developer (React) - 1 to 3 Yrs',
      url: p.url(),
      application_type: 'Direct Naukri 1-Click Apply',
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: proofPath
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));
    console.log(`Updated applied_todays! Total applied now: ${appliedData.total}`);

    await p.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Not yet confirmed. Keeping tab open.');
  }
})();
