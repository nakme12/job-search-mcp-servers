const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const examTab = list.find(t => t.url && t.url.includes('exams.red-sag.com'));
    const oauthTab = list.find(t => t.url && t.url.includes('accounts.google.com/signin/oauth'));
    
    console.log('Exam Tab:', examTab ? examTab.url : 'None');
    console.log('OAuth Tab:', oauthTab ? oauthTab.url : 'None');

    if (oauthTab) {
      const ws = new WebSocket(oauthTab.webSocketDebuggerUrl);
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
          console.log('OAuth Tab Text:\n', resp.result.result.value.substring(0, 500));
          ws.close();
        }
      });
    }
  });
});
