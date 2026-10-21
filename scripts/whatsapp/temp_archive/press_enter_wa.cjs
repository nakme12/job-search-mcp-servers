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
      // Dispatch Enter key to submit attachment
      ws.send(JSON.stringify({
        id: 1,
        method: 'Input.dispatchKeyEvent',
        params: {
          type: 'rawKeyDown',
          windowsVirtualKeyCode: 13,
          key: 'Enter',
          code: 'Enter'
        }
      }));
      ws.send(JSON.stringify({
        id: 2,
        method: 'Input.dispatchKeyEvent',
        params: {
          type: 'keyUp',
          windowsVirtualKeyCode: 13,
          key: 'Enter',
          code: 'Enter'
        }
      }));
      setTimeout(() => {
        console.log('Enter key dispatched for PDF send');
        ws.close();
        process.exit(0);
      }, 500);
    });
  });
});
