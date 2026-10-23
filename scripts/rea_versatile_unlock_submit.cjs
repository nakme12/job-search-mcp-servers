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
  console.log('[Versatile REA Unlock] Unlocking hidden container and filling form...');
  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  // 1. Reveal form container
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const container = document.querySelector('.thjmf-job-application');
      if (container) {
        container.style.display = 'block';
      }
      // Populate fields
      document.querySelector('#name').value = 'Pratik Patidar';
      document.querySelector('#email').value = 'pratikpatidar7990@gmail.com';
      document.querySelector('#phone_dial_code').value = '+91';
      document.querySelector('#phone_country_code').value = 'IN';
      document.querySelector('#phone').value = '8269647990';
      document.querySelector('#cover_letter').value = 'I am a React.js and Frontend Developer with 1.5 years of experience building modern web apps.';
      return 'Container revealed and inputs populated!';
    })()
    `
  });

  // 2. Inject Resume File via CDP DOM.setFileInputFiles
  console.log('[Versatile REA Unlock] Injecting resume file...');
  const doc = await send('DOM.getDocument', { depth: 0 });
  const node = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#resume'
  });
  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  await send('DOM.setFileInputFiles', {
    nodeId: node.nodeId,
    files: [resumePath]
  });
  console.log('[Versatile REA Unlock] Resume injected!');
  await new Promise(r => setTimeout(r, 1500));

  // 3. Click the actual button #thjmf_apply_job
  console.log('[Versatile REA Unlock] Clicking button#thjmf_apply_job...');
  await send('Runtime.evaluate', {
    expression: `
    (() => {
      const btn = document.querySelector('button#thjmf_apply_job');
      if (btn) btn.click();
    })()
    `
  });

  console.log('[Versatile REA Unlock] Waiting 8s for AJAX submission response...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const text = document.body ? document.body.innerText.replace(/\\s+/g, ' ') : '';
      const alerts = Array.from(document.querySelectorAll('.thjmf-message, [class*="message"], [class*="alert"], [class*="success"]')).map(el => el.innerText.trim());
      return { text: text.slice(0, 500), alerts };
    })()
    `,
    returnByValue: true
  });
  console.log('[Versatile REA Result]:\n', JSON.stringify(result.result.value, null, 2));

  const text = result.result.value.text;
  const isConfirmed = /thank you|application submitted|application received|submitted successfully|applied|received your application|success/i.test(text) ||
                      result.result.value.alerts.some(a => /thank you|success|received|applied/i.test(a));

  if (isConfirmed) {
    console.log('🎉🎉🎉 VERSATILE APPLICATION FULLY CONFIRMED & SUBMITTED!');
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-23\\shift1\\versatileit_direct_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('[Versatile REA] Physical proof screenshot saved:', ssPath);

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
      channel: 'Direct Company Career Site (WordPress Form - Slot 7 REA)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('[Versatile REA] File 5 locked! Total confirmed:', f5.total);

    const http = require('http');
    http.get(`http://127.0.0.1:9222/json/close/${targetId}`, () => {
      console.log('[Versatile REA] Submitted tab closed per Rule 57.');
      ws.close();
      process.exit(0);
    });
  } else {
    console.log('⚠️ Under audit. Tab left open.');
    ws.close();
    process.exit(0);
  }
});
