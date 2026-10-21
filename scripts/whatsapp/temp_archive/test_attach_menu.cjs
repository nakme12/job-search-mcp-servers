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
      // Click button[aria-label="Attach"]
      const expr = `
        (() => {
          const btn = document.querySelector('button[aria-label="Attach"]');
          if (btn) {
            btn.click();
            return 'Clicked Attach button';
          }
          return 'Attach button not found';
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
        console.log(resp.result.result.value);
        setTimeout(() => {
          const checkExpr = `
            (() => {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              return inputs.map((inp, idx) => ({
                index: idx,
                accept: inp.getAttribute('accept'),
                html: inp.outerHTML.substring(0, 160)
              }));
            })()
          `;
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: { expression: checkExpr, returnByValue: true }
          }));
        }, 500);
      } else if (resp.id === 2) {
        console.log('File inputs available after Attach menu opens:');
        console.log(JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
        process.exit(0);
      }
    });
  });
});
