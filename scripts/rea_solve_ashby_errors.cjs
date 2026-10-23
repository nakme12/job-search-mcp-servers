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
  console.log('[REA] Connected. Solving Name, Location, Radio dispatchers...');
  await send('Runtime.enable');
  await send('Page.enable');

  const fixRes = await send('Runtime.evaluate', {
    expression: `
    (() => {
      // 1. Native Value Setter
      function triggerInput(el, val) {
        if (!el) return false;
        el.focus();
        const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set ||
                  Object.getOwnPropertyDescriptor(el, 'value')?.set;
        if (s) s.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        return true;
      }

      // Name
      triggerInput(document.querySelector('#_systemfield_name'), 'Pratik Patidar');

      // Email
      triggerInput(document.querySelector('#_systemfield_email'), 'pratikpatidar7990@gmail.com');

      // Location - type into the custom combobox input
      const loc = document.querySelector('input[placeholder="Start typing..."]');
      if (loc) {
        triggerInput(loc, 'India');
      }

      // Radio - trigger actual click event on the radio label/button
      const radios = Array.from(document.querySelectorAll('label, div, span, input[type="radio"]'));
      const linkedInRadio = radios.find(r => r.innerText && r.innerText.trim() === 'LinkedIn');
      if (linkedInRadio) {
        linkedInRadio.click();
      } else {
        const rInput = document.querySelector('#\\\\8f830fc5-da22-4c19-bd15-4b3b97fa2e86_57dceffd-6928-46f9-8ec3-d7156e1c54a4-labeled-radio-2');
        if (rInput) {
          rInput.click();
          rInput.checked = true;
          rInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      return {
        name: document.querySelector('#_systemfield_name')?.value,
        loc: loc?.value,
        radioClicked: !!linkedInRadio
      };
    })()
    `,
    returnByValue: true
  });
  console.log('[REA] Inputs update result:', fixRes.result.value);

  // Wait 1.5s for location dropdown menu to appear and click first option
  await new Promise(r => setTimeout(r, 1500));
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const option = document.querySelector('[role="option"], ul[class*="menu"] li, div[class*="option"]');
      if (option) {
        option.click();
        return option.innerText;
      }
      return null;
    })()
    `
  });

  // Re-check error banner
  await new Promise(r => setTimeout(r, 1000));

  console.log('[REA] Clicking Submit Application...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const btn = document.querySelector('.ashby-application-form-submit-button');
      if (btn) btn.click();
    })()
    `
  });

  console.log('[REA] Waiting 7 seconds for response...');
  await new Promise(r => setTimeout(r, 7000));

  const textRes = await send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText.replace(/\\s+/g, " ") : ""',
    returnByValue: true
  });
  const text = textRes.result.value;
  console.log('[REA] Response Text:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 ELEVENLABS ASHBY APPLICATION FULLY SUBMITTED!');
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\elevenlabs_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('[REA] Physical proof screenshot saved:', ssPath);

    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\data\\daily\\applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-23', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'ElevenLabs',
      role: 'Full-Stack Engineer (Frontend Leaning) - Studio',
      url: 'https://jobs.ashbyhq.com/elevenlabs/e6924f60-c8cc-42b3-9d05-2442ec30e12d/application',
      channel: 'Ashby Direct ATS (Slot 7 Fully Automated via REA CDP)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('[REA] File 5 locked! Total confirmed applications:', f5.total);

    const http = require('http');
    http.get(`http://127.0.0.1:9222/json/close/${targetId}`, () => {
      console.log('[REA] Tab pruned per Rule 57.');
      ws.close();
      process.exit(0);
    });
  } else {
    console.log('⚠️ Notice: Submit clicked, checking status...');
    ws.close();
    process.exit(0);
  }
});
