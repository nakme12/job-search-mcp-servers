const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
    if (!waTab) return;
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      // Click attach (+) button to pop open attachment options (Photos, Document, etc.)
      const expr = `
        (() => {
          const plusBtn = document.querySelector('span[data-icon="plus"]') || 
                          document.querySelector('button[title="Attach"]') ||
                          document.querySelector('div[title="Attach"]');
          if (plusBtn) {
            plusBtn.closest('button, div[role="button"]').click();
            return 'Clicked plus button';
          }
          return 'Plus button not found';
        })()
      `;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    });

    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Plus click result:', resp.result.result.value);
        // Wait 600ms and check file inputs again
        setTimeout(() => {
          const checkExpr = `
            (() => {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              return inputs.map((inp, idx) => ({
                index: idx,
                accept: inp.getAttribute('accept'),
                outerHTML: inp.outerHTML.substring(0, 150)
              }));
            })()
          `;
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: { expression: checkExpr, returnByValue: true }
          }));
        }, 600);
      } else if (resp.id === 2) {
        console.log('Inputs after plus click:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
        process.exit(0);
      }
    });
  });
});
