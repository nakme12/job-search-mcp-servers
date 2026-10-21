const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

const targetPhone = '919893393058';
const waUrl = 'https://web.whatsapp.com/send?phone=' + targetPhone;

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
    if (!waTab) {
      console.log('No WhatsApp Web tab found');
      return;
    }
    console.log('Navigating WhatsApp tab to direct chat:', waUrl);
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.navigate',
        params: { url: waUrl }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Navigation triggered successfully');
        http.get('http://127.0.0.1:9222/json/activate/' + waTab.id, () => {
          console.log('WhatsApp tab brought to focus');
          ws.close();
          process.exit(0);
        });
      }
    });
  });
});
