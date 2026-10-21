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
      const expr = `
        (() => {
          const btns = Array.from(document.querySelectorAll('footer button')).map((b, i) => ({
            i,
            title: b.getAttribute('title'),
            aria: b.getAttribute('aria-label'),
            text: b.innerText,
            html: b.outerHTML.substring(0, 150)
          }));
          return btns;
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
        console.log('Footer buttons:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
        process.exit(0);
      }
    });
  });
});
