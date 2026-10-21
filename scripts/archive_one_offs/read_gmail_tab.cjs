const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const gmailTab = tabs.find(t => t.url && t.url.includes('KtbxLwGvXBphMxXvpvHnPnpHKXWJHSFmBq'));
    if (!gmailTab || !gmailTab.webSocketDebuggerUrl) {
      console.log('No tab found');
      return;
    }
    const ws = new WebSocket(gmailTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: '(() => { const el = document.querySelector("div[role=main]"); return el ? el.innerText : document.title; })()'
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('=== EMAIL CONTENT ===\n' + resp.result.result.value);
        ws.close();
        process.exit(0);
      }
    });
  });
});
