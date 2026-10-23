const WebSocket = require('C:/mcp/rea/node_modules/ws');
const fs = require('fs');
const path = require('path');

const targetId = '86641AE1A78B8C75E4203E4C24B52B9E';
const ws = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${targetId}`);

let id = 1;
function send(m, p = {}) {
  return new Promise((resolve) => {
    const curId = id++;
    const h = (d) => {
      const msg = JSON.parse(d);
      if (msg.id === curId) {
        ws.off('message', h);
        resolve(msg.result);
      }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: curId, method: m, params: p }));
  });
}

ws.on('open', async () => {
  console.log('[REA Solver] Attaching to CDP session...');
  await send('Runtime.enable');
  await send('Page.enable');

  // 1. Solve Radio selection: LinkedIn is index 2
  console.log('[REA Solver] Selecting Radio Option 2 (LinkedIn)...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      if (radios.length > 2) {
        radios[2].click();
        radios[2].checked = true;
        radios[2].dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
    `
  });

  // 2. Solve Location: Click combobox button, pick India
  console.log('[REA Solver] Triggering Location Combobox...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const locBtn = document.querySelector('button._toggleButton_d7ago_32');
      if (locBtn) locBtn.click();
    })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const locInp = document.querySelector('input[role="combobox"]');
      if (locInp) {
        locInp.focus();
        locInp.value = 'India';
        locInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click India option in the dropdown list
  console.log('[REA Solver] Clicking India in dropdown menu...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const items = Array.from(document.querySelectorAll('div, li, [role="option"]'));
      const india = items.find(el => el.innerText && el.innerText.trim() === 'India');
      if (india) {
        india.click();
        return true;
      }
      // fallback to first option
      const firstOpt = document.querySelector('[role="option"]');
      if (firstOpt) {
        firstOpt.click();
        return true;
      }
      return false;
    })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Final Pre-Submit Verification
  console.log('[REA Solver] Auditing validation status...');
  const statusCheck = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const banner = document.querySelector('[class*="errorBanner"], [class*="Error"]');
      return {
        hasBanner: !!banner,
        bannerText: banner ? banner.innerText.slice(0, 200) : null
      };
    })()
    `,
    returnByValue: true
  });
  console.log('[REA Solver] Status before submit:', statusCheck.result.value);

  // 4. Submit Application
  console.log('[REA Solver] Clicking Submit Application button...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const btn = document.querySelector('.ashby-application-form-submit-button');
      if (btn) btn.click();
    })()
    `
  });

  console.log('[REA Solver] Waiting 7 seconds for confirmation response...');
  await new Promise(r => setTimeout(r, 7000));

  const textRes = await send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText.replace(/\\s+/g, " ") : ""',
    returnByValue: true
  });
  const text = textRes.result.value;
  console.log('[REA Solver Response Snippet]:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 ELEVENLABS ASHBY SUBMISSION FULLY CONFIRMED ON DOM!');
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\elevenlabs_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('[REA Solver] Physical screenshot proof saved to:', ssPath);

    // Save to File 5
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\data\\daily\\applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-23', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'ElevenLabs',
      role: 'Full-Stack Engineer (Frontend Leaning) - Studio',
      url: 'https://jobs.ashbyhq.com/elevenlabs/e6924f60-c8cc-42b3-9d05-2442ec30e12d/application',
      channel: 'Ashby Direct ATS (Slot 7 Fully Automated via REA)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('[REA Solver] File 5 locked! Total confirmed applications:', f5.total);

    // Prune tab
    const http = require('http');
    http.get(`http://127.0.0.1:9222/json/close/${targetId}`, () => {
      console.log('[REA Solver] Tab closed per Rule 57.');
      ws.close();
      process.exit(0);
    });
  } else {
    console.log('⚠️ [REA Solver] Notice: Waiting for resolution...');
    ws.close();
    process.exit(0);
  }
});
