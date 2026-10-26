const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const examTab = list.find(t => t.url && t.url.includes('exams.red-sag.com'));
    if (!examTab) { console.log('Exam Tab not found'); return; }

    const ws = new WebSocket(examTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: 'document.body.innerText',
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Exam Page Text:\n', resp.result.result.value);
        ws.close();
      }
    });
  });
});
