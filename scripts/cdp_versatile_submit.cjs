const WebSocket = require('C:/mcp/rea/node_modules/ws');
const fs = require('fs');
const path = require('path');

const targetId = '1730E7BDF9C5F67FC62CDDEBC1D6F812';
const ws = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${targetId}`);

let id = 1;
function send(m, p = {}) {
  return new Promise(r => {
    const cur = id++;
    const h = d => {
      const msg = JSON.parse(d);
      if (msg.id === cur) { ws.off('message', h); r(msg.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });
}

ws.on('open', async () => {
  console.log('[Versatile Direct] Connected via WebSocket...');
  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  // Fill text fields
  console.log('[Versatile Direct] Filling inputs...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      function fill(sel, val) {
        const el = document.querySelector(sel);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      fill('#name', 'Pratik Patidar');
      fill('#email', 'pratikpatidar7990@gmail.com');
      fill('#phone_dial_code', '+91');
      fill('#phone', '8269647990');
      fill('#cover_letter', 'I am a React.js and Frontend Developer with 1.5 years of experience building scalable web applications with React, Next.js, and TypeScript.');
      return {
        name: document.querySelector('#name')?.value,
        email: document.querySelector('#email')?.value
      };
    })()
    `,
    returnByValue: true
  });

  // Attach Resume PDF via CDP DOM.setFileInputFiles
  console.log('[Versatile Direct] Injecting Resume PDF via CDP...');
  const doc = await send('DOM.getDocument', { depth: 0 });
  const node = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#resume'
  });
  console.log('[Versatile Direct] Resume node ID:', node.nodeId);

  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  await send('DOM.setFileInputFiles', {
    nodeId: node.nodeId,
    files: [resumePath]
  });
  console.log('[Versatile Direct] Resume file attached successfully!');
  await new Promise(r => setTimeout(r, 2000));

  // Click Submit Button
  console.log('[Versatile Direct] Clicking Submit button...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"]');
      if (btn) btn.click();
    })()
    `
  });

  console.log('[Versatile Direct] Waiting 7s for server confirmation response...');
  await new Promise(r => setTimeout(r, 7000));

  const textRes = await send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText.replace(/\\s+/g, " ") : ""',
    returnByValue: true
  });
  const text = textRes.result.value;
  console.log('[Versatile Direct Response Snippet]:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied|received your application|success/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 VERSATILE DIRECT SUBMISSION CONFIRMED ON DOM!');
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\versatileit_direct_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('[Versatile Direct] Proof screenshot saved:', ssPath);

    // Save to File 5
    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\data\\daily\\applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-23', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'VersatileIT',
      role: 'React.js Developer (Fresher / 0–1 Year)',
      url: 'https://versatileit.in/jobs/react-js-developer-fresher-0-1-year-experience/',
      channel: 'Direct Company Career Site (Slot 7 Fully Automated via CDP)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('[Versatile Direct] File 5 Locked! Total Confirmed Applied:', f5.total);

    const http = require('http');
    http.get(`http://127.0.0.1:9222/json/close/${targetId}`, () => {
      console.log('[Versatile Direct] Submitted tab closed per Rule 57.');
      ws.close();
      process.exit(0);
    });
  } else {
    console.log('⚠️ Notice: Submit clicked, checking status...');
    ws.close();
    process.exit(0);
  }
});
