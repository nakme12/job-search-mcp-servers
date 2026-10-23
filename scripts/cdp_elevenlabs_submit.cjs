const WebSocket = require('C:/mcp/rea/node_modules/ws');
const fs = require('fs');
const path = require('path');

const targetId = '86641AE1A78B8C75E4203E4C24B52B9E';
const wsUrl = `ws://127.0.0.1:9222/devtools/page/${targetId}`;
const ws = new WebSocket(wsUrl);

let msgId = 1;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const timeout = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for response to ${method} (id: ${id})`));
    }, 15000);

    const handler = (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.off('message', handler);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function runDirectCdpSubmit() {
  console.log('[CDP] Connecting to ElevenLabs tab WebSocket...');
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('[CDP] Connected successfully.');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  console.log('[CDP] Waiting 4s for React hydration...');
  await new Promise(r => setTimeout(r, 4000));

  const pageInfo = await send('Runtime.evaluate', {
    expression: 'document.title + " | " + document.querySelectorAll("input").length'
  });
  console.log('[CDP] Page Info:', pageInfo.result.value);

  // 1. Fill Text Inputs and Textareas
  console.log('[CDP] Injecting Candidate Form Data...');
  const fillRes = await send('Runtime.evaluate', {
    expression: `
    (() => {
      function setVal(el, val) {
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set ||
                       Object.getOwnPropertyDescriptor(el, 'value')?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      setVal(document.querySelector('#_systemfield_name'), 'Pratik Patidar');
      setVal(document.querySelector('#_systemfield_email'), 'pratikpatidar7990@gmail.com');
      setVal(document.querySelector('#\\\\2b49a7e0-85b8-42a2-ada1-ed2cccda6708'), 'https://github.com/pratikpatidar');
      setVal(document.querySelector('#\\\\074cc7e6-c220-470a-89fc-e1065dedf902'), 'https://www.linkedin.com/in/pratik-patidar');
      
      const locInp = document.querySelector('input[placeholder="Start typing..."]');
      if (locInp) setVal(locInp, 'India');

      const radio = document.querySelector('#\\\\8f830fc5-da22-4c19-bd15-4b3b97fa2e86_57dceffd-6928-46f9-8ec3-d7156e1c54a4-labeled-radio-2');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }

      setVal(document.querySelector('#fb09524d-54c8-4e17-96f0-fdb7ebad942e'), 'ElevenLabs is pioneering generative audio AI. With 1.5 years of experience building high-performance frontend interfaces in React and TypeScript, I am passionate about crafting intuitive creation workflows that empower global creators.');
      setVal(document.querySelector('#\\\\1a525ee4-2c70-4e0c-99ad-52f6169b8333'), 'Optimizing complex dashboard rendering pipelines by diagnosing React re-render cycles, memoizing expensive AST/audio trees, and debouncing state updates, cutting UI latency by 40%.');

      return {
        name: document.querySelector('#_systemfield_name')?.value,
        email: document.querySelector('#_systemfield_email')?.value
      };
    })()
    `,
    returnByValue: true
  });
  console.log('[CDP] Filled Data Verification:', fillRes.result.value);

  // 2. Resume File Upload via CDP DOM.setFileInputFiles
  console.log('[CDP] Locating #_systemfield_resume DOM node...');
  const doc = await send('DOM.getDocument', { depth: 0 });
  const node = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#_systemfield_resume'
  });
  console.log('[CDP] Resume File NodeId:', node.nodeId);

  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  console.log('[CDP] Setting Resume File Path:', resumePath);
  await send('DOM.setFileInputFiles', {
    nodeId: node.nodeId,
    files: [resumePath]
  });
  console.log('[CDP] Resume file injected successfully!');
  await new Promise(r => setTimeout(r, 2000));

  // 3. Pre-submit Validation Error Audit
  const errorAudit = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const errors = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const c = typeof el.className === 'string' ? el.className.toLowerCase() : '';
          return c.includes('error') || el.getAttribute('aria-invalid') === 'true';
        })
        .map(e => e.innerText.trim()).filter(Boolean);
      return Array.from(new Set(errors));
    })()
    `,
    returnByValue: true
  });
  console.log('[CDP Pre-Submit Validation Errors]:', errorAudit.result.value);

  // 4. Submit Form
  console.log('[CDP] Clicking .ashby-application-form-submit-button...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const btn = document.querySelector('.ashby-application-form-submit-button');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
    `
  });

  console.log('[CDP] Clicked Submit! Waiting 7s for server confirmation...');
  await new Promise(r => setTimeout(r, 7000));

  // 5. Assert Confirmation Screen
  const domResult = await send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText.replace(/\\s+/g, " ") : ""',
    returnByValue: true
  });
  const text = domResult.result.value;
  console.log('[CDP Live Result Text Snippet]:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 ELEVENLABS ASHBY SUBMISSION FULLY CONFIRMED VIA CDP!');
    
    // Capture post-submit proof screenshot via CDP Page.captureScreenshot
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\elevenlabs_ashby_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('[CDP] Proof screenshot physically saved to:', ssPath);

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
      channel: 'Ashby Direct ATS (Slot 7 Fully Automated via CDP)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('[CDP] File 5 updated successfully! Total confirmed:', f5.total);

    // Prune tab
    const http = require('http');
    http.get(`http://127.0.0.1:9222/json/close/${targetId}`, () => {
      console.log('[CDP] Submitted tab closed per Rule 57.');
      ws.close();
      process.exit(0);
    });
  } else {
    console.log('⚠️ [CDP] Server confirmation not detected yet. Tab kept open.');
    ws.close();
    process.exit(0);
  }
}

runDirectCdpSubmit().catch(e => {
  console.error('[CDP Fatal Error]:', e);
  ws.close();
  process.exit(1);
});
