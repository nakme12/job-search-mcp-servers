const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const list = JSON.parse(data);
    const gmailTab = list.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
    const ws = new WebSocket(gmailTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      const code = `(() => {
        const row = document.querySelector('div[role="main"] tr[role="row"]');
        if (!row) return 'No row found';
        return JSON.stringify({
          ariaLabel: row.getAttribute('aria-labelledby') || '',
          text: row.innerText,
          html: row.innerHTML
        });
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: code, returnByValue: true }
      }));
    });
    ws.on('message', (msg) => {
      const res = JSON.parse(msg);
      const parsed = JSON.parse(res.result?.result?.value || '{}');
      console.log('Row text:', parsed.text);
      console.log('Row HTML sample:', (parsed.html || '').slice(0, 1000));
      ws.close();
    });
  });
});
