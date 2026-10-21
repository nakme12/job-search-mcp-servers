const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const list = JSON.parse(data);
    const gmailTab = list.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
    if (!gmailTab) {
      console.log('No gmail tab');
      return;
    }
    const ws = new WebSocket(gmailTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      const code = `(() => {
        const subject = document.querySelector('h2.hP')?.innerText || 'No Subject';
        const sender = document.querySelector('span.gD')?.innerText || document.querySelector('span[email]')?.getAttribute('email') || 'Unknown';
        const senderEmail = document.querySelector('span[email]')?.getAttribute('email') || '';
        const bodySnippet = document.querySelector('div.a3s')?.innerText?.slice(0, 1000) || '';
        return JSON.stringify({ subject, sender, senderEmail, bodySnippet });
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: code, returnByValue: true }
      }));
    });
    ws.on('message', (msg) => {
      const response = JSON.parse(msg);
      console.log('Open thread:', response.result?.result?.value);
      ws.close();
    });
  });
});
