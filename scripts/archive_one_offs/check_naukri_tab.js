const WebSocket = require('ws');

async function checkNaukri() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/524897C8CC72E42EC4ED83CE2E41CC3B');
  
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const title = document.title;
          const url = window.location.href;
          const expElem = document.querySelector('.styles_jhc__exp__nK_Uk, .experience, [class*="exp"]');
          const applyBtn = document.querySelector('.apply-button, button[id*="apply"], [class*="apply-button"]');
          return {
            title,
            url,
            expText: expElem ? expElem.innerText : 'Not found',
            applyBtnText: applyBtn ? applyBtn.innerText : 'Not found',
            isApplied: document.body.innerText.includes('already applied') || document.body.innerText.includes('Application sent')
          };
        })()`,
        returnByValue: true
      }
    }));
  });

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    console.log('Result:', JSON.stringify(data.result, null, 2));
    ws.close();
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}

checkNaukri();
