const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(x => x.url().includes('jsr-technologies'));
  if (!p) {
    console.log('No JSR Technologies tab found!');
    return;
  }

  console.log('1. Found Tab:', await p.title());

  // Click Apply button
  console.log('2. Clicking Apply button...');
  const clicked = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const applyBtn = btns.find(b => {
      const t = (b.innerText || '').trim().toLowerCase();
      return t === 'apply' || t === 'apply on company site' || t.includes('easy apply') || t === 'apply now';
    });
    if (applyBtn) {
      applyBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
      applyBtn.click();
      return { success: true, text: applyBtn.innerText.trim() };
    }
    return { success: false };
  });

  console.log('Apply Click Result:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  // Check state: did a modal or questionnaire pop up?
  const modalInfo = await p.evaluate(() => {
    const modal = document.querySelector('.apply-message, .modal, [class*="modal"], [class*="drawer"], [class*="chatbot"], [class*="apply-layer"]');
    const text = document.body ? document.body.innerText : '';
    const isApplied = /applied successfully|application sent|you have successfully applied|applied on/i.test(text);

    // Look for form questions inside modal
    const questions = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      label: el.closest('div') ? el.closest('div').innerText.slice(0, 100) : ''
    }));

    return {
      isApplied,
      hasModal: !!modal,
      questionsCount: questions.length,
      snippet: text.slice(0, 500)
    };
  });

  console.log('Post-Click State:\n', JSON.stringify(modalInfo, null, 2));

  // If questions exist and not yet confirmed, fill questionnaire
  if (!modalInfo.isApplied && modalInfo.questionsCount > 0) {
    console.log('Filling questionnaire fields...');
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

      // Check radio buttons (e.g. Yes for relocation/immediate)
      const radioLabels = Array.from(document.querySelectorAll('label, input[type="radio"]'));
      for (const rl of radioLabels) {
        let text = rl.innerText ? rl.innerText.toLowerCase() : '';
        if (text.includes('yes') || text.includes('immediate') || text.includes('15 days')) {
          rl.click();
        }
      }

      // Click save & apply / submit
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /save and apply|submit|continue|apply/i.test(b.innerText));
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 4000));
  }

  // Final check for confirmation
  const finalCheck = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isSuccess = /applied successfully|application sent|you have successfully applied|applied on|already applied/i.test(text);
    return {
      isSuccess,
      snippet: text.slice(0, 500)
    };
  });

  console.log('Final confirmation check:\n', JSON.stringify(finalCheck, null, 2));

  if (finalCheck.isSuccess) {
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\naukri_jsr_technologies_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'naukri_jsr_' + Date.now(),
      company: 'J S R Technologies Pvt Ltd',
      role: 'React Developer (1-2 Yrs, Remote)',
      url: p.url(),
      application_type: 'Direct Naukri 1-Click Apply',
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: proofPath
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));
    console.log(`Updated applied_todays_2026-10-19.json! Total applied now: ${appliedData.total}`);

    await p.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Not confirmed. Tab kept open for review.');
  }
})();
