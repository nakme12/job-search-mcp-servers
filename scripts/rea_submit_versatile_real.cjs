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
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  ws.on('message', d => {
    const msg = JSON.parse(d);
    if (msg.method === 'Network.responseReceived') {
      const url = msg.params.response.url;
      if (url.includes('versatile') || url.includes('admin-ajax')) {
        console.log('[Network Response]:', msg.params.response.status, url);
      }
    }
  });

  console.log('[Versatile Direct] Requesting form submit via HTMLFormElement.prototype.submit...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const form = document.querySelector('form#thjmf_job_application');
      if (form) {
        form.submit();
        return 'form.submit() called!';
      }
      return 'form not found';
    })()
    `
  });

  console.log('[Versatile Direct] Waiting 8s for page reload / confirmation...');
  await new Promise(r => setTimeout(r, 8000));

  const textRes = await send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText.replace(/\\s+/g, " ") : ""',
    returnByValue: true
  });
  const text = textRes.result.value;
  console.log('[Versatile Result Text Snippet]:\n', text.slice(0, 450));

  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied|received your application|successfully/i.test(text);
  if (isConfirmed) {
    console.log('🎉🎉🎉 VERSATILE DIRECT SUBMISSION CONFIRMED ON DOM!');
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\versatileit_direct_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('[Versatile Direct] Proof screenshot saved:', ssPath);

    const f5Path = 'C:\\mcp\\job-search-mcp-engine\\data\\daily\\applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-23', shift: 1, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'VersatileIT',
      role: 'React.js Developer (Fresher / 0–1 Year)',
      url: 'https://versatileit.in/jobs/react-js-developer-fresher-0-1-year-experience/',
      channel: 'Direct Company Career Site (WordPress Form - Slot 7)',
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
    console.log('⚠️ Status under check...');
    ws.close();
    process.exit(0);
  }
});
