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
      // Find menu items after attach is open
      const expr = `
        (() => {
          const menuItems = Array.from(document.querySelectorAll('ul li, div[role="menuitem"]')).map(el => ({
            text: el.innerText.trim(),
            hasFileInput: !!el.querySelector('input[type="file"]'),
            fileAccept: el.querySelector('input[type="file"]') ? el.querySelector('input[type="file"]').getAttribute('accept') : null
          }));
          return menuItems.filter(m => m.text.length > 0);
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
        console.log('Attach menu items:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
        process.exit(0);
      }
    });
  });
});
