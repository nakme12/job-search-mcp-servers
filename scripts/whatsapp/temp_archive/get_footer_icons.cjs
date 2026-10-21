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
      // Find all buttons or spans in chat footer
      const expr = `
        (() => {
          const footer = document.querySelector('footer');
          if (!footer) return 'No footer';
          const icons = Array.from(footer.querySelectorAll('span[data-icon], button')).map(el => ({
            tag: el.tagName,
            icon: el.getAttribute('data-icon'),
            title: el.getAttribute('title') || el.getAttribute('aria-label')
          }));
          return icons;
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
        console.log('Footer buttons & icons:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
        process.exit(0);
      }
    });
  });
});
